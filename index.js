// backend/index.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = 'mongodb+srv://<username>:<password>@<cluster-host>/library_lending?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Schema defining library book details including inventory count
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String, required: true, unique: true },
  totalCopies: { type: Number, required: true },
  availableCopies: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now }
});

const Book = mongoose.model('Book', bookSchema);

// Schema defining loan status, due date, and association back to a book's string ID
const loanSchema = new mongoose.Schema({
  bookId: { type: String, required: true },
  borrowerName: { type: String, required: true },
  borrowedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedAt: { type: Date, default: null },
  status: { type: String, enum: ['Borrowed', 'Returned'], default: 'Borrowed' }
});

const Loan = mongoose.model('Loan', loanSchema);

// ROUTE A — POST /books: Adds a new book to the inventory catalog
app.post('/books', async (req, res) => {
  try {
    const { title, author, isbn, totalCopies } = req.body;
    if (!title || !author || !isbn || totalCopies === undefined) {
      return res.status(400).json({ error: "title, author, isbn, and totalCopies are required" });
    }
    if (Number(totalCopies) <= 0) {
      return res.status(400).json({ error: "totalCopies must be a positive number" });
    }
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(409).json({ error: "A book with this ISBN already exists" });
    }
    const newBook = new Book({
      title,
      author,
      isbn,
      totalCopies: Number(totalCopies),
      availableCopies: Number(totalCopies)
    });
    await newBook.save();
    return res.status(201).json(newBook);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ROUTE B — GET /books: Lists all catalog books with dynamic pagination and partial search filtering
app.get('/books', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const total = await Book.countDocuments(query);
    const data = await Book.find(query).skip(skip).limit(limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({ data, page, limit, total, totalPages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ROUTE C — GET /books/:id: Fetches a single specific book entry using its unique document ID
app.get('/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    return res.status(200).json(book);
  } catch (err) {
    return res.status(404).json({ error: "Book not found" });
  }
});

// ROUTE D — POST /loans: Creates a library borrowing transaction while verifying inventory availability
app.post('/loans', async (req, res) => {
  try {
    const { bookId, borrowerName, dueDate } = req.body;
    if (!bookId || !borrowerName || !dueDate) {
      return res.status(400).json({ error: "bookId, borrowerName, and dueDate are required" });
    }
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.availableCopies <= 0) {
      return res.status(409).json({ error: "No available copies to borrow" });
    }
    book.availableCopies -= 1;
    await book.save();

    const newLoan = new Loan({
      bookId,
      borrowerName,
      dueDate: new Date(dueDate),
      status: 'Borrowed'
    });
    await newLoan.save();
    return res.status(201).json(newLoan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ROUTE E — GET /loans: Lists administrative borrowing histories, offering status filters and sorting rules
app.get('/loans', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && (status === 'Borrowed' || status === 'Returned')) {
      query.status = status;
    }

    const total = await Loan.countDocuments(query);
    const data = await Loan.find(query).sort({ borrowedAt: -1 }).skip(skip).limit(limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({ data, page, limit, total, totalPages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ROUTE F — GET /loans/overdue: Aggregates unreturned active records whose due targets match past timestamps
app.get('/loans/overdue', async (req, res) => {
  try {
    const overdueLoans = await Loan.find({
      status: 'Borrowed',
      dueDate: { $lt: new Date() }
    });
    return res.status(200).json(overdueLoans);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ROUTE G — PUT /loans/:id/return: Finalizes returns, marks timestamps, and increments relevant inventory charts
app.put('/loans/:id/return', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    if (loan.status === 'Returned') {
      return res.status(400).json({ error: "This loan has already been returned" });
    }

    loan.status = 'Returned';
    loan.returnedAt = new Date();
    await loan.save();

    const book = await Book.findById(loan.bookId);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    return res.status(200).json(loan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ROUTE H — DELETE /books/:id: Evaluates current checkout dependencies and cleans out valid target records
app.delete('/books/:id', async (req, res) => {
  try {
    const activeLoans = await Loan.findOne({ bookId: req.params.id, status: 'Borrowed' });
    if (activeLoans) {
      return res.status(409).json({ error: "Cannot delete a book that is currently borrowed" });
    }
    const result = await Book.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Book not found" });
    }
    return res.status(200).json({ message: `Book ${req.params.id} deleted` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});