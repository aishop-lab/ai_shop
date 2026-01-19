// Modern Minimal Theme - Contact Component

export default function Contact() {
  return (
    <div className="modern-minimal-contact py-12">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
        Contact Us
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="contact-info">
          <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
          <div className="space-y-4 text-gray-600" style={{ fontFamily: 'var(--font-body)' }}>
            <p>Email: contact@store.com</p>
            <p>Phone: +91 00000 00000</p>
          </div>
        </div>
        <div className="contact-form">
          {/* Contact form will be rendered here */}
        </div>
      </div>
    </div>
  )
}
