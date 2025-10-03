document.addEventListener('DOMContentLoaded', () => {
    // تشخیص زبان بر اساس پارامتر url
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || 'fa'; // پیشفرض فارسی

    // پیام‌های دوزبانه
    const messages = {
        noUser: {
            fa: 'لطفاً دوباره وارد شوید.',
            en: 'Please log in again.'
        },
        noUserConsole: {
            fa: 'هیچ کاربری در localStorage یافت نشد',
            en: 'No user found in localStorage'
        },
        statusLoadError: {
            fa: 'خطا در بارگذاری وضعیت درخواست.',
            en: 'Error loading request status.'
        },
        messageLoadError: {
            fa: 'خطا در بارگذاری پیام‌ها.',
            en: 'Error loading messages.'
        },
        messageEmpty: {
            fa: 'پیام نمی‌تواند خالی باشد.',
            en: 'Message cannot be empty.'
        },
        messageSendSuccess: {
            fa: 'پیام با موفقیت ارسال شد.',
            en: 'Message sent successfully.'
        },
        messageSendError: {
            fa: 'خطا در ارسال پیام: ',
            en: 'Error sending message: '
        },
        serverError: {
            fa: 'خطا در ارتباط با سرور.',
            en: 'Server communication error.'
        },
        acceptedStatus: (repName) => ({
            fa: `درخواست شما توسط ${repName || 'نماینده'} تأیید شده است، نماینده جهت هماهنگی بیشتر با شما تماس می‌گیرد. <a href="/payment.html?role=tourist" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-2">پرداخت</a>`,
            en: `Your request has been accepted by ${repName || 'the representative'}. The representative will contact you for further coordination. <a href="/payment.html?role=tourist" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-2">Payment</a>`
        }),
        pendingStatus: (repName) => ({
            fa: `درخواست شما به ${repName || 'نماینده'} ارسال شده و در انتظار تأیید است`,
            en: `Your request has been sent to ${repName || 'the representative'} and is pending approval`
        }),
        noRequest: {
            fa: 'هیچ درخواستی ثبت نشده است',
            en: 'No request has been made'
        }
    };

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        console.error(messages.noUserConsole[lang]);
        alert(messages.noUser[lang]);
        window.location.href = '/';
        return;
    }

    // Fetch request status
    fetch(`/get-tourist-status/${user.id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const statusEl = document.getElementById('status');
            if (data.status === 'accepted') {
                statusEl.innerHTML = messages.acceptedStatus(data.repName)[lang];
            } else if (data.status === 'pending') {
                statusEl.textContent = messages.pendingStatus(data.repName)[lang];
            } else {
                statusEl.textContent = messages.noRequest[lang];
            }
        })
        .catch(err => {
            console.error('Error loading status:', err);
            alert(messages.statusLoadError[lang]);
        });

    // Fetch messages
    fetch(`/get-messages/${user.id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const list = document.getElementById('messagesList');
            list.innerHTML = '';
            data.forEach(msg => {
                const div = document.createElement('div');
                div.classList.add('bg-gray-50', 'p-4', 'rounded-lg', 'shadow-sm');
                div.innerHTML = `
                    <p>${lang === 'fa' ? 'پیام' : 'Message'}: ${msg.message}</p>
                    <p>${lang === 'fa' ? 'پاسخ' : 'Reply'}: ${msg.reply || (lang === 'fa' ? 'بدون پاسخ' : 'No reply')}</p>
                `;
                list.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Error loading messages:', err);
            alert(messages.messageLoadError[lang]);
        });

    // Handle message sending
    document.getElementById('sendMessageForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const message = document.getElementById('message').value.trim();
        if (!message) {
            alert(messages.messageEmpty[lang]);
            return;
        }

        fetch('/send-message-to-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert(messages.messageSendSuccess[lang]);
                document.getElementById('message').value = ''; // Clear textarea
                location.reload(); // Refresh to show new message
            } else {
                alert(messages.messageSendError[lang] + data.error);
            }
        })
        .catch(err => {
            console.error('Error sending message:', err);
            alert(messages.serverError[lang]);
        });
    });
});
