import { randomUUID } from 'node:crypto'
import { openDatabase } from '../server/db/database.ts'

const SAMPLE = [
  ['We', 'Yevgeny Zamyatin', ['dystopia', 'classics'], 90],
  ['1984', 'George Orwell', ['dystopia', 'classics'], 100],
  ['Fahrenheit 451', 'Ray Bradbury', ['dystopia', 'science_fiction'], 85],
  ['Dune', 'Frank Herbert', ['science_fiction'], 95],
  ['Foundation', 'Isaac Asimov', ['science_fiction'], 80],
  ['The Hobbit', 'J. R. R. Tolkien', ['fantasy'], 98],
  ['A Game of Thrones', 'George R. R. Martin', ['fantasy'], 92],
  ['The Name of the Rose', 'Umberto Eco', ['mystery', 'history'], 70],
  ['And Then There Were None', 'Agatha Christie', ['mystery', 'classics'], 88],
  ['A Brief History of Time', 'Stephen Hawking', ['popular_science'], 75],
  ['Thinking, Fast and Slow', 'Daniel Kahneman', ['psychology', 'popular_science'], 82],
  ['Sapiens', 'Yuval Noah Harari', ['history', 'popular_science'], 90],
] as const

const db = openDatabase(process.env.DATABASE_PATH ?? 'data/folio.db')
const insert = db.prepare(
  `insert into books (id, isbn_13, source_key, title, authors, genres, language, popularity)
   values (?, null, ?, ?, ?, ?, 'eng', ?) on conflict (source_key) do nothing`,
)
for (const [title, author, genres, popularity] of SAMPLE) {
  insert.run(randomUUID(), `/sample/${title}`, title, JSON.stringify([author]), JSON.stringify(genres), popularity)
}
console.error(`Sample books in database: ${(db.prepare('select count(*) as c from books').get() as { c: number }).c}`)
