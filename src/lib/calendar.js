let calendar;

export function initCalendar(events) {
  const calendarEl = document.getElementById('calendar');
  if (calendarEl) {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      events: events,
      editable: true,
      selectable: true,
      dateClick: function(info) {
        const title = prompt('Masukkan judul jadwal:');
        if (title) {
          const newEvent = {
            title: title,
            start: info.dateStr,
            allDay: true
          };
          calendar.addEvent(newEvent);
          // Di sini Anda bisa menambahkan logika untuk menyimpan acara ke database
        }
      }
    });
    calendar.render();
  }
}
