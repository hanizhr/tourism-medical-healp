
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const lang = localStorage.getItem('lang') || 'fa';

    const messages = {
        fa: {
            loginRequired: 'لطفاً دوباره وارد شوید.',
            noUser: 'لطفاً ابتدا وارد شوید.',
            acceptedRepsNotFound: 'هیچ نماینده‌ای پذیرفته نشده است.',
            errorLoadingAccepted: 'خطا در بارگذاری نمایندگان پذیرفته‌شده.',
            requestsNotFound: 'هیچ درخواستی وجود ندارد.',
            errorLoadingRequests: 'خطا در بارگذاری درخواست‌ها.',
            accept: 'قبول',
            reject: 'رد',
            enterAppointmentTime: 'زمان ملاقات را وارد کنید (مثال: 2025-10-01 14:00):',
            accepted: 'درخواست پذیرفته شد.',
            acceptError: 'خطا در پذیرش درخواست:',
            rejected: 'درخواست رد شد.',
            rejectError: 'خطا در رد درخواست:',
            messagesNotFound: 'هیچ پیامی وجود ندارد.',
            errorLoadingMessages: 'خطا در بارگذاری پیام‌ها.',
            enterMessage: 'پیام به مدیر:',
            messageSent: 'پیام به مدیر ارسال شد.',
            messageSendError: 'خطا در ارسال پیام به مدیر:',
            elementMissing: (el) => `خطا: عنصر ${el} در صفحه یافت نشد.`
        },
        en: {
            loginRequired: 'Please log in again.',
            noUser: 'Please log in first.',
            acceptedRepsNotFound: 'No accepted representatives.',
            errorLoadingAccepted: 'Error loading accepted representatives.',
            requestsNotFound: 'No requests available.',
            errorLoadingRequests: 'Error loading requests.',
            accept: 'Accept',
            reject: 'Reject',
            enterAppointmentTime: 'Enter appointment time (e.g. 2025-10-01 14:00):',
            accepted: 'Request accepted.',
            acceptError: 'Error accepting request:',
            rejected: 'Request rejected.',
            rejectError: 'Error rejecting request:',
            messagesNotFound: 'No messages.',
            errorLoadingMessages: 'Error loading messages.',
            enterMessage: 'Message to admin:',
            messageSent: 'Message sent to admin.',
            messageSendError: 'Error sending message to admin:',
            elementMissing: (el) => `Error: Element "${el}" not found in the page.`
        }
    };

    const t = messages[lang];

    if (!user || !user.id) {
        console.error('No user found in localStorage');
        alert(t.loginRequired);
        window.location.href = '/';
        return;
    }

    function loadAcceptedReps() {
        fetch(`/get-doctor-connections?user=${encodeURIComponent(JSON.stringify(user))}`)
            .then(response => response.json())
            .then(data => {
                const list = document.getElementById('accepted-reps');
                if (!list) {
                    alert(t.elementMissing('accepted-reps'));
                    return;
                }
                list.innerHTML = '';

                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = t.acceptedRepsNotFound;
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(conn => {
                        const li = document.createElement('li');
                        li.className = 'p-4 bg-gray-50 rounded-lg';
                        li.innerHTML = `
                            <strong>${lang === 'fa' ? 'نماینده' : 'Representative'}:</strong> ${conn.repName} <br>
                            <strong>${lang === 'fa' ? 'زمان ملاقات' : 'Appointment Time'}:</strong> ${conn.appointment_time || (lang === 'fa' ? 'نامشخص' : 'Unknown')}
                        `;
                        list.appendChild(li);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading accepted representatives:', err);
                alert(t.errorLoadingAccepted);
            });
    }

    function loadRequests() {
        fetch(`/get-requests-for-doc/${user.id}`)
            .then(response => response.json())
            .then(data => {
                const list = document.getElementById('requests-list');
                if (!list) {
                    alert(t.elementMissing('requests-list'));
                    return;
                }
                list.innerHTML = '';
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = t.requestsNotFound;
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(req => {
                        const li = document.createElement('li');
                        li.className = 'flex justify-between items-center p-4 bg-gray-50 rounded-lg';
                        li.textContent = `${lang === 'fa' ? 'درخواست از' : 'Request from'}: ${req.repName}`;

                        const acceptBtn = document.createElement('button');
                        acceptBtn.textContent = t.accept;
                        acceptBtn.className = 'bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700';
                        acceptBtn.onclick = () => {
                            const appointmentTime = prompt(t.enterAppointmentTime);
                            if (appointmentTime) {
                                fetch('/handle-doc-request', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ reqId: req.id, action: 'accept', appointmentTime })
                                })
                                    .then(res => res.json())
                                    .then(data => {
                                        if (data.success) {
                                            alert(t.accepted);
                                            loadRequests();
                                            loadAcceptedReps();
                                        } else {
                                            alert(t.acceptError + ' ' + (data.error || 'Unknown error'));
                                        }
                                    })
                                    .catch(err => {
                                        console.error('Error accepting request:', err);
                                        alert(t.acceptError);
                                    });
                            }
                        };

                        const rejectBtn = document.createElement('button');
                        rejectBtn.textContent = t.reject;
                        rejectBtn.className = 'bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700';
                        rejectBtn.onclick = () => {
                            fetch('/handle-doc-request', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reqId: req.id, action: 'reject' })
                            })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.success) {
                                        alert(t.rejected);
                                        loadRequests();
                                    } else {
                                        alert(t.rejectError + ' ' + (data.error || 'Unknown error'));
                                    }
                                })
                                .catch(err => {
                                    console.error('Error rejecting request:', err);
                                    alert(t.rejectError);
                                });
                        };

                        li.appendChild(acceptBtn);
                        li.appendChild(rejectBtn);
                        list.appendChild(li);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading requests:', err);
                alert(t.errorLoadingRequests);
            });
    }

    function loadMessages() {
        fetch(`/get-messages/${user.id}`)
            .then(response => response.json())
            .then(data => {
                const list = document.getElementById('messages-list');
                if (!list) {
                    alert(t.elementMissing('messages-list'));
                    return;
                }
                list.innerHTML = '';
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = t.messagesNotFound;
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(msg => {
                        const li = document.createElement('li');
                        li.className = 'p-4 bg-gray-50 rounded-lg';
                        li.innerHTML = `
                            ${msg.message}
                            ${msg.reply ? `<br><strong class="text-green-800">${lang === 'fa' ? 'پاسخ مدیر' : 'Admin Reply'}:</strong> ${msg.reply}` : ''}
                        `;
                        list.appendChild(li);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading messages:', err);
                alert(t.errorLoadingMessages);
            });
    }

    function contactAdmin() {
        const message = prompt(t.enterMessage);
        if (message) {
            fetch('/send-message-to-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, message })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(t.messageSent);
                        loadMessages();
                    } else {
                        alert(t.messageSendError + ' ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error('Error sending message to admin:', err);
                    alert(t.messageSendError);
                });
        }
    }

    loadAcceptedReps();
    loadRequests();
    loadMessages();

    setInterval(loadAcceptedReps, 5000);
    setInterval(loadRequests, 5000);
    setInterval(loadMessages, 5000);

    window.contactAdmin = contactAdmin;
});
