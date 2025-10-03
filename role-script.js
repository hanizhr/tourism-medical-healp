document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('roleForm');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const role = document.getElementById('role').value;
    console.log('role:', role);

    if (!role) {
      alert("لطفاً نقش را انتخاب کنید");
      return;
    }

    const user = JSON.parse(localStorage.getItem('user')) || {};
    fetch('/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: user.mobile, role })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        user.role = role;
        localStorage.setItem('user', JSON.stringify(user));

        if (role === 'doctor') {
          window.location.href = 'doctor-specialty.html';
        } else if (role === 'representative') {
          window.location.href = 'representative-email.html';
        } else {
          window.location.href = `dashboard-${role}.html`;
        }
      } else {
        console.log("Update failed:", data);
      }
    })
    .catch(err => console.error("Fetch error:", err));
  });
});
