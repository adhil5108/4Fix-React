import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, EmptyState } from '../../components/ui.jsx';

function NotFoundPage() {
  return (
    <AppShell width="narrow">
      <EmptyState
        title="Page not found"
        message="The page you’re looking for doesn’t exist."
        action={<ButtonLink to="/">Go to home</ButtonLink>}
      />
    </AppShell>
  );
}

export default NotFoundPage;
