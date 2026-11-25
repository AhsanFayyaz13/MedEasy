import { FiCompass, FiGrid, FiHome, FiSearch } from 'react-icons/fi';
import { useAuth, ROLE_DASHBOARD } from '../../../context/AuthContext';
import { Button, EmptyState } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';

/** 404. Staff are offered their dashboard; shoppers the home page and catalogue. */
export default function NotFound() {
  const { isAuthenticated, userRole } = useAuth();
  const dashboard = isAuthenticated && userRole !== 'patient' ? ROLE_DASHBOARD[userRole] : null;

  return (
    <div className="container py-5">
      <PageMeta title="Page not found" noindex />
      <EmptyState
        icon={<FiCompass />}
        titleAs="h1"
        title="We couldn’t find that page"
        description="The link may be broken or the page may have moved. Let’s get you back on track."
        action={
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {dashboard ? (
              <Button to={dashboard} leftIcon={<FiGrid aria-hidden="true" />}>Go to my dashboard</Button>
            ) : (
              <>
                <Button to="/" leftIcon={<FiHome aria-hidden="true" />}>Go home</Button>
                <Button to="/medicines" variant="secondary" leftIcon={<FiSearch aria-hidden="true" />}>
                  Browse medicines
                </Button>
              </>
            )}
          </div>
        }
      />
    </div>
  );
}
