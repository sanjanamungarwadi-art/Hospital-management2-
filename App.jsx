// frontend/src/App.jsx

import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000';

export default function App() {
  // Add Book Form States
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [totalCopies, setTotalCopies] = useState('');
  const [addFormError, setAddFormError] = useState('');

  // Catalog States
  const [books, setBooks] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [booksPage, setBooksPage] = useState(1);
  const [booksTotalPages, setBooksTotalPages] = useState(1);
  const [deleteErrors, setDeleteErrors] = useState({});

  // Inline Borrow States
  const [activeBorrowBookId, setActiveBorrowBookId] = useState(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Loans States
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loansPage, setLoansPage] = useState(1);
  const [loansTotalPages, setLoansTotalPages] = useState(1);

  // Initial Data Load
  useEffect(() => {
    fetchBooks(1, appliedSearch);
    fetchLoans(1, statusFilter);
  }, []);

  // Sync effect for Catalog state updates
  useEffect(() => {
    fetchBooks(booksPage, appliedSearch);
  }, [booksPage, appliedSearch]);

  // Sync effect for Loans state updates
  useEffect(() => {
    fetchLoans(loansPage, statusFilter);
  }, [loansPage, statusFilter]);

  const fetchBooks = async (page, search) => {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${API_URL}/books?page=${page}&limit=5&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setBooks(json.data || []);
        setBooksTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchLoans = async (page, filter) => {
    setLoansLoading(true);
    try {
      const filterParam = filter !== 'All' ? `&status=${filter}` : '';
      const res = await fetch(`${API_URL}/loans?page=${page}&limit=5${filterParam}`);
      if (res.ok) {
        const json = await res.json();
        setLoans(json.data || []);
        setLoansTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoansLoading(false);
    }
  };

  const handleAddBookSubmit = async (e) => {
    e.preventDefault();
    setAddFormError('');

    if (!title.trim() || !author.trim() || !isbn.trim() || !totalCopies) {
      setAddFormError('All fields are required.');
      return;
    }
    if (parseInt(totalCopies) <= 0) {
      setAddFormError('totalCopies must be a positive number.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          isbn: isbn.trim(),
          totalCopies: parseInt(totalCopies)
        })
      });

      if (res.ok) {
        setTitle('');
        setAuthor('');
        setIsbn('');
        setTotalCopies('');
        fetchBooks(booksPage, appliedSearch);
      } else {
        const errorJson = await res.json();
        setAddFormError(errorJson.error || 'Failed to add book.');
      }
    } catch (err) {
      console.error('Error creating book:', err);
      setAddFormError('Network communication error.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setBooksPage(1);
    setAppliedSearch(searchQuery);
  };

  const handleOpenBorrowForm = (book) => {
    setActiveBorrowBookId(book._id);
    setBorrowerName('');
    setDueDate('');
  };

  const handleCancelBorrow = () => {
    setActiveBorrowBookId(null);
    setBorrowerName('');
    setDueDate('');
  };

  const handleConfirmBorrow = async (bookId) => {
    if (!borrowerName.trim() || !dueDate) {
      alert('Please fill out both borrower name and due date.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          borrowerName: borrowerName.trim(),
          dueDate
        })
      });

      if (res.ok) {
        handleCancelBorrow();
        fetchBooks(booksPage, appliedSearch);
        fetchLoans(loansPage, statusFilter);
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Failed to borrow book.');
      }
    } catch (err) {
      console.error('Error confirming loan transaction:', err);
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      const res = await fetch(`${API_URL}/books/${bookId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchBooks(booksPage, appliedSearch);
      } else {
        const errorJson = await res.json();
        setDeleteErrors((prev) => ({ ...prev, [bookId]: errorJson.error || 'Could not delete book.' }));
        setTimeout(() => {
          setDeleteErrors((prev) => {
            const next = { ...prev };
            delete next[bookId];
            return next;
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Error executing delete instruction:', err);
    }
  };

  const handleReturnLoan = async (loanId) => {
    try {
      const res = await fetch(`${API_URL}/loans/${loanId}/return`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchBooks(booksPage, appliedSearch);
        fetchLoans(loansPage, statusFilter);
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Return submission failed.');
      }
    } catch (err) {
      console.error('Error executing return update sequence:', err);
    }
  };

  const isOverdue = (loan) => {
    if (loan.status !== 'Borrowed') return false;
    return new Date(loan.dueDate) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="app-container">
      <h1>📚 Library Lending System</h1>

      {/* 2. Add Book Card */}
      <div className="card">
        <h2>Add New Book</h2>
        <form onSubmit={handleAddBookSubmit} className="add-book-form">
          <input
            type="text"
            placeholder="Book Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input
            type="text"
            placeholder="ISBN"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <input
            type="number"
            placeholder="Total Copies"
            min="1"
            value={totalCopies}
            onChange={(e) => setTotalCopies(e.target.value)}
          />
          <button type="submit">Add Book</button>
        </form>
        {addFormError && <p className="error-text">{addFormError}</p>}
      </div>

      {/* 3. Catalog Card */}
      <div className="card">
        <h2>Book Catalog</h2>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {catalogLoading ? (
          <p>Loading catalog...</p>
        ) : books.length === 0 ? (
          <p>No books found.</p>
        ) : (
          <div className="book-list">
            {books.map((book) => (
              <div key={book._id} className="book-item-container">
                <div className="book-row">
                  <div className="book-info">
                    <strong>{book.title}</strong> by {book.author}
                    <div className="book-details">
                      <span>ISBN: {book.isbn}</span> | <span className="copies-badge">{book.availableCopies} of {book.totalCopies} copies available</span>
                    </div>
                  </div>
                  <div className="book-actions">
                    {book.availableCopies > 0 ? (
                      <button className="btn-borrow" onClick={() => handleOpenBorrowForm(book)}>Borrow</button>
                    ) : (
                      <span className="out-of-stock-text">No copies available</span>
                    )}
                    <button className="btn-delete" onClick={() => handleDeleteBook(book._id)}>Delete</button>
                  </div>
                </div>

                {deleteErrors[book._id] && (
                  <p className="error-text row-error">{deleteErrors[book._id]}</p>
                )}

                {activeBorrowBookId === book._id && (
                  <div className="borrow-mini-form">
                    <h4>Borrowing: {book.title}</h4>
                    <div className="mini-form-fields">
                      <input
                        type="text"
                        placeholder="Borrower Name"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                      />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                      <div className="mini-form-buttons">
                        <button className="btn-confirm" onClick={() => handleConfirmBorrow(book._id)}>Confirm Borrow</button>
                        <button className="btn-cancel" onClick={handleCancelBorrow}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pagination">
          <button
            disabled={booksPage <= 1}
            onClick={() => setBooksPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <span>Page {booksPage} of {booksTotalPages}</span>
          <button
            disabled={booksPage >= booksTotalPages}
            onClick={() => setBooksPage((prev) => Math.min(prev + 1, booksTotalPages))}
          >
            Next
          </button>
        </div>
      </div>

      {/* 4. Active Loans Card */}
      <div className="card">
        <h2>Active Loans</h2>
        <div className="filter-container">
          <label htmlFor="statusFilter">Status Filter: </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setLoansPage(1);
              setStatusFilter(e.target.value);
            }}
          >
            <option value="All">All</option>
            <option value="Borrowed">Borrowed</option>
            <option value="Returned">Returned</option>
          </select>
        </div>

        {loansLoading ? (
          <p>Loading loans...</p>
        ) : loans.length === 0 ? (
          <p>No loans found.</p>
        ) : (
          <div className="loan-list">
            {loans.map((loan) => (
              <div key={loan._id} className="loan-row">
                <div className="loan-info">
                  <strong>{loan.borrowerName}</strong>
                  <div className="loan-details">
                    <span>Due: {formatDate(loan.dueDate)}</span>
                  </div>
                </div>
                <div className="loan-status-actions">
                  <span className={`badge ${loan.status.toLowerCase()}`}>
                    {loan.status}
                  </span>
                  {isOverdue(loan) && <span className="badge overdue">OVERDUE</span>}
                  {loan.status === 'Borrowed' && (
                    <button className="btn-return" onClick={() => handleReturnLoan(loan._id)}>
                      Mark as Returned
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pagination">
          <button
            disabled={loansPage <= 1}
            onClick={() => setLoansPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <span>Page {loansPage} of {loansTotalPages}</span>
          <button
            disabled={loansPage >= loansTotalPages}
            onClick={() => setLoansPage((prev) => Math.min(prev + 1, loansTotalPages))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}