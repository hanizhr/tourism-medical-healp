document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        console.error('No user found in localStorage');
        alert('لطفاً دوباره وارد شوید.');
        window.location.href = '/';
        return;
    }

    function loadAcceptedTourists() {
        console.log('Loading accepted tourists for representative ID:', user.id);
        fetch(`/get-tourist-connections`)
            .then(response => response.json())
            .then(data => {
                console.log('Accepted tourists received:', data);
                const list = document.getElementById('accepted-tourists');
                if (!list) {
                    console.error('Element with ID "accepted-tourists" not found in DOM');
                    alert('خطا: عنصر توریست‌های پذیرفته‌شده در صفحه یافت نشد.');
                    return;
                }
                list.innerHTML = '';
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'هیچ توریستی پذیرفته نشده است.';
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(conn => {
                        if (conn.rep_id === user.id) {
                            const li = document.createElement('li');
                            li.className = 'p-4 bg-gray-50 rounded-lg';
                            li.textContent = `توریست: ${conn.touristName}`;
                            list.appendChild(li);
                        }
                    });
                }
            })
            .catch(err => {
                console.error('Error loading accepted tourists:', err);
                alert('خطا در بارگذاری توریست‌های پذیرفته‌شده.');
            });
    }

    function loadRequests() {
        console.log('Loading requests for representative ID:', user.id);
        fetch(`/get-requests-for-rep/${user.id}`)
            .then(response => response.json())
            .then(data => {
                console.log('Requests received:', data);
                const list = document.getElementById('requests-list');
                if (!list) {
                    console.error('Element with ID "requests-list" not found in DOM');
                    alert('خطا: عنصر درخواست‌ها در صفحه یافت نشد.');
                    return;
                }
                list.innerHTML = '';
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'هیچ درخواستی وجود ندارد.';
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(req => {
                        const li = document.createElement('li');
                        li.className = 'flex justify-between items-center p-4 bg-gray-50 rounded-lg';
                        li.textContent = `درخواست از: ${req.touristName} (ID: ${req.id})`;
                        const acceptBtn = document.createElement('button');
                        acceptBtn.textContent = 'قبول';
                        acceptBtn.className = 'bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700';
                        acceptBtn.onclick = () => {
                            fetch('/accept-tourist-request', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reqId: req.id })
                            }).then(res => res.json()).then(data => {
                                if (data.success) {
                                    alert('درخواست پذیرفته شد.');
                                    loadRequests();
                                    loadAcceptedTourists();
                                } else {
                                    alert('خطا در پذیرش درخواست: ' + (data.error || 'مشکل ناشناخته'));
                                }
                            }).catch(err => {
                                console.error('Error accepting request:', err);
                                alert('خطا در پذیرش درخواست.');
                            });
                        };
                        li.appendChild(acceptBtn);
                        list.appendChild(li);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading requests:', err);
                alert('خطا در بارگذاری درخواست‌ها.');
            });
    }

    function loadDoctors() {
        fetch('/get-doctors')
            .then(response => response.json())
            .then(data => {
                console.log('Doctors received:', data);
                const list = document.getElementById('doctors-list');
                if (!list) {
                    console.error('Element with ID "doctors-list" not found in DOM');
                    alert('خطا: عنصر دکترها در صفحه یافت نشد.');
                    return;
                }
                list.innerHTML = '';
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'هیچ دکتری موجود نیست.';
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(doc => {
                        const li = document.createElement('li');
                        li.className = 'flex justify-between items-center p-4 bg-gray-50 rounded-lg';
                        li.innerHTML = `
                            <div>
                                <strong>نام:</strong> ${doc.first_name} ${doc.last_name} <br>
                                <strong>تخصص:</strong> ${doc.specialty || 'نامشخص'} <br>
                                <strong>رزومه:</strong> ${doc.resume || 'نامشخص'} <br>
                                <strong>سن:</strong> ${doc.age || 'نامشخص'} <br>
                                <strong>جنسیت:</strong> ${doc.gender || 'نامشخص'} <br>
                                <strong>آدرس:</strong> ${doc.address || 'نامشخص'}
                            </div>
                        `;
                        const requestBtn = document.createElement('button');
                        requestBtn.textContent = 'ارسال درخواست';
                        requestBtn.className = 'bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700';
                        requestBtn.onclick = () => {
                            fetch('/send-request-to-doc', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ repId: user.id, docId: doc.id })
                            }).then(res => res.json()).then(data => {
                                if (data.success) {
                                    alert('درخواست به دکتر ارسال شد.');
                                    loadSentDocRequests();
                                } else {
                                    alert('خطا در ارسال درخواست به دکتر: ' + (data.error || 'مشکل ناشناخته'));
                                }
                            }).catch(err => {
                                console.error('Error sending request to doctor:', err);
                                alert('خطا در ارسال درخواست به دکتر.');
                            });
                        };
                        li.appendChild(requestBtn);
                        list.appendChild(li);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading doctors:', err);
                alert('خطا در بارگذاری دکترها.');
            });
    }

    function loadMessages() {
        console.log('Loading messages for representative ID:', user.id);
        fetch(`/get-messages/${user.id}`)
            .then(response => response.json())
            .then(data => {
                console.log('Messages received:', data);
                const list = document.getElementById('messages-list');
                if (!list) {
                    console.error('Element with ID "messages-list" not found in DOM');
                    alert('خطا: عنصر پیام‌ها در صفحه یافت نشد.');
                    return;
                }
                list.innerHTML = '';
                if (data.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'هیچ پیامی وجود ندارد.';
                    li.className = 'text-gray-500';
                    list.appendChild(li);
                } else {
                    data.forEach(msg => {
                        const li = document.createElement('li');
                        li.className = 'p-4 bg-gray-50 rounded-lg';
                        li.innerHTML = `از ${msg.senderName}: ${msg.message}${msg.reply ? '<br><strong class="text-green-800">پاسخ مدیر:</strong> ' + msg.reply : ''}`;
                        list.appendChild(li);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading messages:', err);
                alert('خطا در بارگذاری پیام‌ها.');
            });
    }

    function contactAdmin() {
        const message = prompt('پیام به مدیر:');
        if (message) {
            console.log('Sending message to admin from representative ID:', user.id);
            fetch('/send-message-to-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, message })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('پیام به مدیر ارسال شد.');
                        loadMessages();
                    } else {
                        alert('خطا در ارسال پیام به مدیر: ' + (data.error || 'مشکل ناشناخته'));
                    }
                })
                .catch(err => {
                    console.error('Error sending message to admin:', err);
                    alert('خطا در ارسال پیام به مدیر.');
                });
        }
    }

function loadSentDocRequests() {
    console.log('Loading sent doctor requests for representative ID:', user.id);
    fetch(`/get-sent-requests-for-rep/${user.id}`)
        .then(res => res.json())
        .then(data => {
            console.log('Sent doctor requests received:', data);
            const list = document.getElementById('sent-doc-requests');
            if (!list) {
                console.error('Element with ID "sent-doc-requests" not found');
                return;
            }
            list.innerHTML = '';
            if (data.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'هیچ درخواستی به دکتری ارسال نشده است.';
                li.className = 'text-gray-500';
                list.appendChild(li);
            } else {
                data.forEach(req => {
                    const li = document.createElement('li');
                    li.className = 'p-4 bg-gray-50 rounded-lg';

                    if (req.status === 'pending') {
                        li.textContent = `درخواست به دکتر ${req.docName} ارسال شد و در انتظار پاسخ است.`;
                    } else if (req.status === 'accepted') {
                        li.innerHTML = `
                            درخواست شما توسط دکتر <strong>${req.docName}</strong> 
                            پذیرفته شد.<br>
                            زمان ویزیت: <span class="text-green-700 font-semibold">${req.appointment_time || 'نامشخص'}</span>
                            <a href="/payment.html?role=representative" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-2 block mt-2">پرداخت به دکتر</a>
                        `;
                    } else if (req.status === 'rejected') {
                        li.innerHTML = `
                            درخواست شما توسط دکتر <strong>${req.docName}</strong> 
                            <span class="text-red-600">رد شد.</span>
                        `;
                    }
                    list.appendChild(li);
                });
            }
        })
        .catch(err => {
            console.error('Error loading sent doctor requests:', err);
            alert('خطا در بارگذاری درخواست‌های ارسال‌شده به دکتر.');
        });
}


    loadAcceptedTourists();
    loadRequests();
    loadDoctors();
    loadMessages();
    loadSentDocRequests();
    setInterval(loadAcceptedTourists, 10000);
    setInterval(loadRequests, 10000);
    setInterval(loadDoctors, 10000);
    setInterval(loadMessages, 10000);
    setInterval(loadSentDocRequests, 10000);
    window.contactAdmin = contactAdmin;
});