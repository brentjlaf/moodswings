document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('faqs.json');
    const data = await res.json();
    const container = document.getElementById('faqList');
    data.faqs.forEach(faq => {
      const item = document.createElement('div');
      item.className = 'faq-item';
      item.innerHTML = `<h3>${faq.question}</h3><p>${faq.answer}</p>`;
      container.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load FAQs', err);
  }
});
