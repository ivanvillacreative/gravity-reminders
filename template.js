module.exports = {
  createTemplate(event, date, emailMessage) {
    return `
      <html>
        <body>
          ${ emailMessage }
          <p>
            <strong>Event: </strong>
            ${ event }
            <br>
            <strong>Date: </strong>
            ${ date }
          </p>
        </body>
      </html>
    `
  }
}