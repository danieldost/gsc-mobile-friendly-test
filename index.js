require('dotenv').config()

const fs = require('fs')
const axios = require('axios')
const csv_parser = require('csv-parser')
const clc = require('cli-color')
const MultiStream = require('multistream')
const CLIProgress = require('cli-progress')

const { is_valid_url, get_errors_stats, clear_output } = require('./utils')
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

if (!GOOGLE_API_KEY) {
  throw new Error('API key not found')
}

const progress_bar = new CLIProgress.SingleBar(
  {
    format: 'Loading GSC stats {bar} {percentage}% || {value}/{total} URLs tested',
    hideCursor: true
  },
  CLIProgress.Presets.shades_grey
)

const urls = []
const console_stats = {}

const fetch_console_stats = async function (url) {
  try {
    const { data } = await axios.post(
      `https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run?key=${GOOGLE_API_KEY}`,
      { url }
    )
    console_stats[url] = data
  } catch (err) {
    const message = err.response?.statusText
    console_stats[url] = { error: message || 'Request errored' }
  } finally {
    progress_bar.increment()
  }
}

new MultiStream(fs.readdirSync('data').map((file_name) => fs.createReadStream(`data/${file_name}`)))
  .pipe(csv_parser())
  .on('data', (data) => {
    if (is_valid_url(data.URL)) urls.push(data.URL)
  })
  .on('end', async () => {
    const total_urls = urls.length
    console.info(`Parsed ${clc.blue(total_urls)} URLs`)
    progress_bar.start(total_urls, 0)
    const requests = urls.map(
      (url, index) =>
        new Promise(
          (resolve) =>
            setTimeout(async () => {
              await fetch_console_stats(url)
              resolve()
            }, index * 1100) // api has a 60 rpm limit
        )
    )
    await Promise.all(requests)

    progress_bar.stop()
    console.info('Saving results...')
    clear_output()
    fs.writeFileSync('./console_stats.json', JSON.stringify(console_stats), 'utf-8')
    const { total } = get_errors_stats(console_stats)
    console.info(`${total} issues found.`)

    if (total > 0) console.warn(`See ${clc.red('console_stats_errors.json')} report to learn more.`)
  })
