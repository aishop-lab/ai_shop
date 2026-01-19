// Modern Minimal Theme - About Component

export default function About() {
  return (
    <div className="modern-minimal-about py-12">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
        About Us
      </h1>
      <div className="prose max-w-none" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-lg text-gray-600">
          Store description and story will be displayed here.
        </p>
      </div>
    </div>
  )
}
