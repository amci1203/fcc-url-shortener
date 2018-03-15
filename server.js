/*
  As this is a proof of concept, I'm not going to bother with setting up a MongoDB instance
  Not like this is meant to to actually be used by alot of people
  I am fully aware of the fact that using a text file for this kinda thing is a horrible idea in practice
  I am also very aware that manipulating data with GET requests is a horrible idea as well--again, just did the quickest thing for the POC
  With that in mind, DO NOT use this for real--play with it, sure, but anybody can edit/delete/overwrite shortened URLs
  Maybe I'll make a more robust URL shortener some other time on my own server....maybe not
*/

// init project
const fs = require('fs') 
const app = require('express')()
const PORT = process.env.PORT
const URLS_FILE = 'urls.txt'

// Thank you Regex Tester (https://www.regextester.com/94502)
const isValidUrl = str => /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(str)

const urls = fs.readFileSync(URLS_FILE, 'utf8')
.split('\n')
.reduce((obj, str) => {
  const pipe = str.indexOf('|')
  return {
    ...obj,
    [str.substring(pipe + 1)]: str.substring(0, pipe)
  }
}, {})

const generateID = (() => {
  let counter = 0
  
  return function (returnCounter = false) {
    const rand = Math.random()
    const now = Date.now()
    
    const id = Math.floor(Math.pow(rand * now, 1/3)) + '' + counter
    counter++
    
    if (urls[id]) generateID(returnCounter) // no overwrites
    
    return returnCounter
    ? { counter, id }
    : id
  }
})()

app

.get('/new/*', (req, res) => {
  const original = req.url.substring(5)
  
  if (!original) {
    res.json({ error: 'You must specify a URL for us to shorten' })
    return
  }
  if (!isValidUrl(original)) {
    res.json({ error: 'The URL passed is not valid' })
    return
  }
 
  const id = generateID()
  const string = `\n${ original }|${ id }`
        
  fs.appendFileSync(URLS_FILE, string, 'utf8')
  urls[id] = original
  
  const message = `URL ${ original } successfully shortened.`
  const shortened = `{ req.host }/${ id }`
  
  res.json({ message, original, shortened })
})

.get('/edit/:id/*', (req, res) => {
  const { id } = req.params
  const prevUrl = urls[id]
  
  if (!prevUrl) {
    res.send('No url with the specified ID exists')
    return
  }
  const editedUrl = req.url.substring(req.url.indexOf('/', 6) + 1)
  urls[id] = editedUrl
  
  const string = Object.keys(urls).reduce((str, key, i) => (
    `${ str }${ i ? '\n' : '' }${ urls[key] }|${ key }`
  ), '')
  
  fs.writeFileSync(URLS_FILE, string, 'utf8')
  res.json({ prevUrl, editedUrl })
})

.get('/delete/:id', (req, res) => {
  const { id } = req.params
  const url = urls[id]
  
  if (!url) {
    res.json({ error: 'No url with the specified ID exists' })
    return
  }
  
  delete urls[id]
  const string = Object.keys(urls).reduce((str, key, i) => (
    `${ str }${ i ? '\n' : '' }${ urls[key] }|${ key }`
  ), '')
  
  fs.writeFileSync(URLS_FILE, string, 'utf8')
  res.json({ message: 'Successfully Deleted' })
})

.get('/sites', (req, res) => {
  const sites = fs.readFileSync(URLS_FILE, 'utf8')
  res.json({ sites, urls })
})

.get('/id', (req, res) => {
  const id = generateID()
  res.json(id)
})

.get('/:id', (req, res) => {
  const { id } = req.params
  const url = urls[id]
  
  if (!url) {
    res.status(404).json({ error: 'No url with the specified ID exists' })
    return
  }
  
  res.redirect(urls[id])
})

.listen(PORT, err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('Listening on port %s', PORT)
})