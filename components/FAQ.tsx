import content from "@/content";

export default function FAQ() {
  return (
    <section id="faq" className="py-24 bg-base-100">
      <div className="max-w-2xl mx-auto px-8">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {content.faqs.questions.map((faq, i) => (
            <div key={faq.question} className="collapse collapse-arrow bg-base-200">
              <input
                type="radio"
                name="faq-accordion"
                defaultChecked={i === 0}
              />
              <div className="collapse-title text-lg font-medium">
                {faq.question}
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
