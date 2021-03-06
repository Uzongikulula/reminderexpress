

const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser');


app.use(express.static(path.join(__dirname, 'public')))
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', (req, res) =>{
  res.render('index.html');
})

app.post('/', (req, res) => {
  const tkn=req.body.token;
  const fs = require('fs');
  const {google} = require('googleapis');

  const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
  // The file token.json stores the user's access and refresh tokens, and is
  // created automatically when the authorization flow completes for the first
  // time.
  const TOKEN_PATH = 'token.json';

  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), listEvents);
  });

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  function getAccessToken(oAuth2Client, callback) {
    oAuth2Client.getToken(tkn, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  }


});


app.post('/events', (req, res) =>{

  const { google } = require('googleapis')

  const { OAuth2 } = google.auth

  
  const oAuth2Client = new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET)

 
  oAuth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  })

 
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })


 
  const startTime = new Date(req.body.startTime)
  startTime.setDate(startTime.getDate())

  const endTime = new Date(req.body.endTime)
    endTime.setDate(endTime.getDate())

  const event = {
    summary: `${req.body.summary}`,
    description: `${req.body.description}`,
    colorId: 6,
    start: {
      dateTime:startTime,
    },
    end: {
      dateTime:endTime,
    },
  }

  calendar.freebusy.query(
    {
      resource: {
        timeMin: startTime ,
        timeMax: endTime ,
        items: [{ id: 'primary' }],
      },
    },
    (err, res) => {
     
      if (err) return console.error('Free Busy Query Error: ', err)

      
      const eventArr = res.data.calendars.primary.busy

      
      if (eventArr.length <= 10) {
        
        return calendar.events.insert(
          { calendarId: 'primary', resource: event },
          err => {
            
            if (err) return console.error('Error Adding Event:', err)
           
            return console.log('Event created successfully.');
          })
        }
      
      return console.log(`There is already an event at this time`)
    }
  )
  console.log(req.body)
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: req.body.to, 
    from: 'reminderexpress@gmail.com',
    subject: req.body.summary,
    text: req.body.description,
    html: req.body.description,
  }
  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent')
    })
    .catch((error) => {
      console.error(error)
    })

  res.render('events.html')
})

app.listen(3000, () =>{
  console.log('Server running on port 3000')
})