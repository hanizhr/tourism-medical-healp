document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // جلوگیری از رفرش شدن صفحه
    const name = document.getElementById('name').value;
    const mobile = document.getElementById('mobile').value;

    if (!name || !mobile) {
        alert('لطفاً نام و شماره موبایل را وارد کنید.');
        return;
    }

    console.log('Sending login request:', { name, mobile });

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile })
    })
    .then(response => {
        console.log('Response received:', response);
        return response.json();
    })
    .then(data => {
        console.log('Data received:', data); 
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = data.user.role ? `/dashboard-${data.user.role}.html` : '/role-selection.html';
        } else {
            alert('خطا در ورود. لطفاً دوباره تلاش کنید.');
        }
    })
    .catch(err => {
        console.error('Error during login:', err);
        alert('خطا در ارتباط با سرور.');
    });
});
