/**
 * Neutral "safe" page used as the destination of the Quick Exit button.
 * Contains nothing that could reveal the nature of this website.
 */
export default function About() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-bold text-navy">Tourism Foundation</h1>
      <p className="mt-4 text-ink/70">
        The Tourism Foundation works to support sustainable travel and cultural heritage
        across the region.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-navy">Our mission</h2>
      <p className="mt-2 text-sm text-ink/70">
        We bring together local communities, travel operators, and cultural institutions
        to make tourism a positive and lasting force for the places we visit.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-navy">Contact</h2>
      <p className="mt-2 text-sm text-ink/70">
        For general enquiries please contact us by email at{" "}
        <a href="mailto:info@tourism-foundation.example" className="text-safety">
          info@tourism-foundation.example
        </a>
        .
      </p>
    </div>
  );
}