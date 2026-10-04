import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Button } from './ui.jsx';

// Service search: a field with a search icon. The submit button appears once there is
// something to search for (the keyboard's search key also submits).
function SearchBar({ initialValue = '', placeholder, onSearch, autoFocus = false }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form className="search" role="search" onSubmit={handleSubmit}>
      <Search aria-hidden="true" />
      <input
        type="search"
        enterKeyHint="search"
        className="search__input"
        value={value}
        placeholder={placeholder ?? t('public.search.placeholder')}
        aria-label={t('public.search.label')}
        maxLength={80}
        autoFocus={autoFocus}
        onChange={(event) => setValue(event.target.value)}
      />
      {value.trim() ? (
        <Button type="submit" size="sm">
          {t('public.search.submit')}
        </Button>
      ) : null}
    </form>
  );
}

export default SearchBar;
