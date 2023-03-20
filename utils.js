const { readFileSync, writeFileSync } = require('fs')

const STATS_PATH = './console_stats.json'
const ERRORS_PATH = './console_stats_errors.json'

const is_valid_url = (string) => {
  try {
    return Boolean(new URL(string))
  } catch (e) {
    return false
  }
}

const clear_output = () => {
  writeFileSync(STATS_PATH, '')
  writeFileSync(ERRORS_PATH, '')
}

const get_errors_stats = (stats) => {
  let data = stats

  if (!data) {
    const raw_data = readFileSync(STATS_PATH, { encoding: 'utf8' })
    data = JSON.parse(raw_data)
  }

  const errors = Object.entries(data).reduce((acc, [url, data]) => {
    if (data.mobileFriendliness !== 'MOBILE_FRIENDLY') acc[url] = data

    return acc
  }, {})

  const total = Object.keys(errors).length
  if (total > 0)
    writeFileSync(ERRORS_PATH, JSON.stringify(errors), {
      encoding: 'utf8'
    })

  return { errors, total }
}

module.exports = {
  get_errors_stats,
  is_valid_url,
  clear_output
}
