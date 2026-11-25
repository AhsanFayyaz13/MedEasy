import { Link, useLocation } from 'react-router-dom';
import { FiPrinter } from 'react-icons/fi';
import { Button } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { LEGAL_LAST_UPDATED, LEGAL_LINKS } from '../../../lib/business';
import { formatDate } from '../../../lib/format';
import '../legal.css';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Renders a legal document from structured content.
 * doc: { title, description, intro, sections: [{ heading, body: Node | Node[] }] }
 */
export default function LegalPage({ doc }) {
  const { pathname } = useLocation();
  const sections = doc.sections.map((s) => ({ ...s, id: slug(s.heading) }));

  return (
    <div className="legal">
      <PageMeta title={doc.title} description={doc.description} />
      <div className="container legal__layout">
        <aside className="legal__aside" aria-label="Legal documents">
          <nav>
            <p className="legal__aside-title">Policies</p>
            <ul>
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} aria-current={pathname === l.to ? 'page' : undefined}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="legal__toc" aria-label="On this page">
            <p className="legal__aside-title">On this page</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}><a href={`#${s.id}`}>{s.heading}</a></li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="legal__doc">
          <header className="legal__header">
            <p className="legal__eyebrow">Legal</p>
            <h1>{doc.title}</h1>
            <p className="legal__updated">
              Last updated: <time dateTime={LEGAL_LAST_UPDATED}>{formatDate(LEGAL_LAST_UPDATED, { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            </p>
            <Button variant="secondary" size="sm" leftIcon={<FiPrinter aria-hidden="true" />} onClick={() => window.print()} className="legal__print">
              Print
            </Button>
          </header>

          {doc.intro && <div className="legal__intro">{doc.intro}</div>}

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>
                <span className="legal__num" aria-hidden="true">{i + 1}.</span> {s.heading}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
