import { useState } from 'react';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SearchBar({ initialValue = '', placeholder = 'Search services, e.g. AC not cooling', onSearch, size }) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form className={`search-bar${size ? ` search-bar--${size}` : ''}`} role="search" onSubmit={handleSubmit}>
      <span className="search-bar__icon">
        <SearchIcon />
      </span>
      <input
        type="search"
        className="search-bar__input"
        value={value}
        placeholder={placeholder}
        aria-label="Search services"
        maxLength={80}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="btn btn--primary btn--sm search-bar__button">
        Search
      </button>
    </form>
  );
}

export default SearchBar;
