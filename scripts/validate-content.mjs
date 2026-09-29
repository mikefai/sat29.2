import { access, readFile } from 'node:fs/promises'

const questions = JSON.parse(await readFile(new URL('../public/questions/questions.json', import.meta.url), 'utf8'))
const expectedModules = ['rw1', 'rw2', 'm1', 'm2']
const ids = new Set()
const errors = []

if (questions.length !== 108) errors.push(`Expected 108 questions, found ${questions.length}`)

for (const question of questions) {
  if (ids.has(question.id)) errors.push(`Duplicate id: ${question.id}`)
  ids.add(question.id)
  if (!question.answer) errors.push(`Missing answer: ${question.id}`)
  if (!question.image?.endsWith('.png')) errors.push(`Missing image path: ${question.id}`)
  try {
    await access(new URL(`../public${question.image}`, import.meta.url))
  } catch {
    errors.push(`Missing image file: ${question.id}`)
  }
}

for (const moduleId of expectedModules) {
  const selected = questions.filter((question) => question.section === moduleId)
  if (selected.length !== 27) errors.push(`${moduleId}: expected 27 questions, found ${selected.length}`)
  for (const test of [9, 10, 11]) {
    const count = selected.filter((question) => question.test === test).length
    if (count !== 9) errors.push(`${moduleId}: expected 9 from Test ${test}, found ${count}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Validated 108 questions: 27 per module, 9 per source test, with unique IDs, images, and answer keys.')
