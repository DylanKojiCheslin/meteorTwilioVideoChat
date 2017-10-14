import { AccessToken } from 'twilio.jwt.AccessToken';
const VideoGrant = AccessToken.VideoGrant;

Meteor.methods({
  requestVideoChatAccess:function(roomName){
    check(roomName, String);
    const token = new AccessToken(
    Meteor.settings.private.twilio.accountSid,
    Meteor.settings.private.twilio.apiKey,
    Meteor.settings.private.twilio.apiKeySecret
    );
    token.identity = Random.id();
    const grant = new VideoGrant();
    token.addGrant(grant);
    const response = {
      identity: token.identity,
      token: token.toJwt()
    }
    return response;
  }
});



//fix line
app.get('/token', function(request, response) {
  var identity = randomName();

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  var token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  // Assign the generated identity to the token.
  token.identity = identity;

  // Grant the access token Twilio Video capabilities.
  var grant = new VideoGrant();
  token.addGrant(grant);

  // Serialize the token to a JWT string and include it in a JSON response.
  response.send({
    identity: identity,
    token: token.toJwt()
  });
});
