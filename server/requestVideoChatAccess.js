const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

Meteor.methods({
  requestVideoChatAccess:function(){
    if (Meteor.isServer){
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
  }
});
