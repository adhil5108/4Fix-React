import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Form validators return already-translated messages. When the UI language changes,
// re-run the validator and swap in the new wording for errors that are still showing,
// so visible validation messages switch language along with the rest of the page.
export function useTranslatedErrors(setErrors, revalidate) {
  const { i18n } = useTranslation();
  const revalidateRef = useRef(revalidate);
  const language = useRef(i18n.language);
  revalidateRef.current = revalidate;

  useEffect(() => {
    if (language.current === i18n.language) {
      return;
    }

    language.current = i18n.language;
    setErrors((current) => {
      if (!Object.values(current).some(Boolean)) {
        return current;
      }

      const fresh = revalidateRef.current();
      return Object.fromEntries(
        Object.entries(current).map(([field, message]) => [field, message ? fresh[field] || message : message]),
      );
    });
  }, [i18n.language, setErrors]);
}
