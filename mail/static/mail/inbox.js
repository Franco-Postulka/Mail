document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#single-email').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  document.querySelector('#compose-form').onsubmit = () =>{

    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body =  document.querySelector('#compose-body').value;

    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
          recipients: recipients,
          subject: subject,
          body: body
      })
    })
    .then(response => response.json())
    .then(result => {
        // Print result
        if (result.message){
          load_mailbox('sent');
        } else {
          alert(`${result.error}`);
          document.querySelector('#compose-recipients').value = '';
        }
    });
    return false;
  }
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#single-email').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
      if (emails.length > 0){
        for (let i = 0; i < emails.length; i++) {
          const element = document.createElement('div');
          if (mailbox === 'sent'){
            const recipientsDiv = document.createElement('div');
            recipientsDiv.innerHTML = emails[i].recipients;

            element.append(recipientsDiv);
          }else{
            const senderDiv = document.createElement('div');
            senderDiv.innerHTML = emails[i].sender;

            element.append(senderDiv);
          }
          const subjectDiv = document.createElement('div');
          subjectDiv.innerHTML = emails[i].subject;

          const timestampDiv = document.createElement('div');
          timestampDiv.innerHTML = emails[i].timestamp;
          
        
          element.append(subjectDiv);
          element.append(timestampDiv);
          element.id = `${emails[i].id}`;

        document.querySelector('#emails-view').append(element);
        if (emails[i].read === true){
          element.className = 'read';
        }else{
          element.className = 'unread';
        }
        }
        view_email(mailbox);
      }
  });
}

function view_email(mailbox){
  document.addEventListener('click', function clickHandler(event) {
    // Desactivar el event listener para evitar múltiples clics
    document.removeEventListener('click', clickHandler);

    // Find what was clicked on
    let element = event.target;
    
    // Realizar tu lógica restante aquí...
    if (element.parentElement && element.parentElement.className){
      if (element.parentElement.className === 'read' || element.parentElement.className === 'unread' ){
        element = element.parentElement;
      }
    }
    // Check if the user clicked on an email
    if (element.className === 'read' || element.className === 'unread' ) {
      document.querySelector('#emails-view').style.display  = 'none';
      document.querySelector('#single-email').style.display = 'block';
      fetch(`/emails/${element.id}`)
      .then(response => response.json())
      .then(email => {
        if (email.read === false){
          fetch(`/emails/${email.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                read: true
            })
          })
        }
        document.querySelector('#single-email').innerHTML = 
        `<p><span>From: </span> ${email.sender}</p> 
        <p><span>To: </span>${email.recipients}</p>
        <p><span>Date: </span>${email.timestamp}</p><hr> 
        <p><span>Subject: </span>${email.subject}</p><hr> 
        ${email.body}<hr>`;
        archive(mailbox,email);
        reply(mailbox,email);
      });
    }
  });
}

function archive(mailbox,email){
  if (mailbox != 'sent'){
    const button = document.createElement('button');
    if (email.archived === false){
      button.innerHTML = "Archive";
      document.querySelector('#single-email').append(button);
      button.onclick = function() {
        fetch(`/emails/${email.id}`,{
          method: 'PUT',
          body: JSON.stringify({
            archived: true
          })
        })
        .then(response => {
          if (response.ok) {
            load_mailbox('inbox');
          }})
      }
    }else{
      button.innerHTML = "Unarchive";
      document.querySelector('#single-email').append(button);
      button.onclick = function() {
        fetch(`/emails/${email.id}`,{
          method: 'PUT',
          body: JSON.stringify({
            archived: false
          })
        })
        .then(response => {
          if (response.ok) {
            load_mailbox('inbox');
          }})
      }
    }
  }
}

function reply(mailbox, email){
  if (mailbox != 'sent'){
    const button = document.createElement('button');
    button.innerHTML = "Reply";
    document.querySelector('#single-email').append(button);
    button.onclick = function() {
      // Show compose view and hide other views
      document.querySelector('#emails-view').style.display = 'none';
      document.querySelector('#compose-view').style.display = 'block';
      document.querySelector('#single-email').style.display = 'none';

      // Clear out composition fields
      document.querySelector('#compose-recipients').value = email.sender;
      document.querySelector('#compose-recipients').disabled = true;
      let subject_init = email.subject.slice(0, 3);
      console.log(subject_init);
      if (subject_init != 'Re:'){
        document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
      }
      else{
        document.querySelector('#compose-subject').value = email.subject;
      }
      document.querySelector('#compose-subject').disabled = true;

      document.querySelector('#compose-body').value = `
      -----------------------------------------------------------
      On ${email.timestamp} ${email.sender} wrote:
      "${email.body}"`;

      document.querySelector('#compose-form').onsubmit = () =>{

        const recipients = document.querySelector('#compose-recipients').value;
        const subject = document.querySelector('#compose-subject').value;
        const body =  document.querySelector('#compose-body').value;

        fetch('/emails', {
          method: 'POST',
          body: JSON.stringify({
              recipients: recipients,
              subject: subject,
              body: body
          })
        })
        .then(response => response.json())
        .then(result => {
            // Print result
            if (result.message){
              load_mailbox('sent');
            } else {
              alert(`${result.error}`);
              document.querySelector('#compose-recipients').value = '';
            }
        });
        return false;
      }
    }
  }
}