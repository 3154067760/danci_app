import fs from 'node:fs'

export function readText(filePath) {
  let text = fs.readFileSync(filePath, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text
}

export function detectDelimiter(line) {
  const tabs = (line.match(/\t/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  return tabs > commas ? '\t' : ','
}

export function parseCsv(text, delimiter) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    if (row.length > 1 || row[0] !== '') rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === delimiter) {
      pushField()
      continue
    }

    if (char === '\n') {
      pushField()
      pushRow()
      continue
    }

    if (char === '\r') continue

    field += char
  }

  if (field.length > 0 || row.length > 0) {
    pushField()
    pushRow()
  }

  return rows
}

export function rowsToObjects(rows) {
  if (rows.length === 0) return []

  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).flatMap((cells) => {
    if (cells.every((cell) => !cell.trim())) return []

    const record = {}
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim()
    })
    return [record]
  })
}

export function readCsvFile(filePath) {
  const text = readText(filePath)
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const rows = parseCsv(text, delimiter)
  return rowsToObjects(rows)
}

export function escapeCsvField(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function writeCsvFile(filePath, headers, records) {
  const lines = [
    headers.join(','),
    ...records.map((record) => headers.map((header) => escapeCsvField(record[header] ?? '')).join(',')),
  ]
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\n')}\n`, 'utf8')
}
