import { FiCompass, FiHome, FiSearch } from 'react-icons/fi';
import { Button, EmptyState } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';

export default function NotFound() {
  return (
    <div className="container py-5">
      <PageMeta title="Page not found" noindex />
      <EmptyState
        icon={<FiCompass />}
        title="We couldn’t find that page"
        description="The link may be broken or the page may have moved. Let’s get you back on track."
        action={
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Button to="/" leftIcon={<FiHome aria-hidden="true" />}>Go home</Button>
            <Button to="/medicines" variant="secondary" leftIcon={<FiSearch aria-hidden="true" />}>
              Browse medicines
            </Button>
          </div>
        }
      />
    </div>
  );
}
