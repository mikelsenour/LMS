const CONTACT = {
  email: 'mikelsenour@gmail.com',
  whatsapp: '254748645168',     // country code + number, no "+" and no spaces
  phone: '+254748645168'
};

(function () {
  const box = document.getElementById('contactButtons');

  function addButton(label, href, filled) {
    if (!filled) return;   // skip anything still a placeholder
    const a = document.createElement('a');
    a.className = 'btn';
    a.href = href;
    a.textContent = label;
    if (href.startsWith('http')) a.target = '_blank';
    box.appendChild(a);
  }

  addButton('Email us', 'mailto:' + CONTACT.email, !CONTACT.email.includes('example'));
  addButton('WhatsApp us',
    'https://wa.me/' + CONTACT.whatsapp + '?text=' +
      encodeURIComponent('Hello, I found you through your website.'),
    !CONTACT.whatsapp.includes('X'));
  addButton('Call', 'tel:' + CONTACT.phone, !CONTACT.phone.includes('X'));

  if (box.children.length === 0) box.textContent = 'Contact details coming soon.';
})();