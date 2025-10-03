document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        console.error('No user found in localStorage');
        alert('لطفاً دوباره وارد شوید.');
        window.location.href = '/';
        return;
    }

    fetch('/get-representatives')
        .then(response => response.json())
        .then(data => {
            console.log('Representatives received:', data);
            const select = document.getElementById('representative');
            select.innerHTML = '<option value="" disabled selected>یک نماینده انتخاب کنید</option>';
            data.forEach(rep => {
                const option = document.createElement('option');
                option.value = rep.id;
                option.textContent = `${rep.name} (${rep.email}, سن: ${rep.age || 'نامشخص'}, جنسیت: ${rep.gender || 'نامشخص'}, آدرس: ${rep.address || 'نامشخص'})`;
                select.appendChild(option);
            });
        })
        .catch(err => {
            console.error('Error loading representatives:', err);
            alert('خطا در بارگذاری نمایندگان.');
        });

    document.getElementById('selectRepForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const repId = document.getElementById('representative').value;
        if (!repId) {
            alert('لطفاً یک نماینده انتخاب کنید.');
            return;
        }

        console.log('Submitting request to representative ID:', repId);

        fetch('/request-representative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ touristId: user.id, repId })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Request response:', data);
            if (data.success) {
                alert('درخواست به نماینده ارسال شد.');
                window.location.href = '/dashboard-tourist.html';
            } else {
                alert('خطا در ارسال درخواست.');
            }
        })
        .catch(err => {
            console.error('Error sending request:', err);
            alert('خطا در ارتباط با سرور.');
        });
    });
});