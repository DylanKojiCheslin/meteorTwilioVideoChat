import Video from 'twilio-video';

function attachTracksToDomElement(tracks, domElement) {
  tracks.forEach(function(track) {
    domElement.appendChild(track.attach());
  });
}

function attachParticipantTracks(participant, domElement) {
  var tracks = Array.from(participant.tracks.values());
  attachTracksToDomElement(tracks, domElement);
}

function muteTracks(tracks) {
  tracks.forEach(function(track) {
    if (track.kind == "audio") {
      track.disable();
    }
  });
}

function unmuteTracks(tracks) {
  tracks.forEach(function(track) {
    if (track.kind == "audio") {
      track.enable();
    }
  });
}

function roomJoined(room, template){
  if (! template.localTracks) {
    const localMediaElement = document.getElementById("local-media");
    attachParticipantTracks(room.localParticipant, localMediaElement);
    template.localTracks = room.localParticipant.tracks;
    template.localMediaAttached.set(true);
  }
}

function createLocalTracks(template) {
  return new Promise((resolve, reject) => {
    const localMediaElement = document.getElementById("local-media");
    Video.createLocalTracks().then(
      function(tracks) {
        template.localTracks = tracks;
        attachTracksToDomElement( tracks, localMediaElement );
        resolve(tracks);
      },
      function(error) {
        console.error('Unable to access local media', error);
        reject('Unable to access Camera and Microphone');
      }
    );
  });
}

Template.videoChat.onCreated(function (){
   this.localMediaAttached = new ReactiveVar(null);
   this.localMuted = new ReactiveVar(null);
   const self = this;
   Meteor.call(
     "requestVideoChatAccess", function(error, result){
       if (error) {
         console.error(error.reason)
       }
       if (result) {
         self.accessData = result;
       }
     });

});

Template.videoChat.onRendered(function (){
   this.localMediaAttached.set(false);
   this.localMuted.set(false);
});

Template.videoChat.helpers({
  inPreviewMode: function () {
    return (Template.instance().localMediaAttached.get())
  },
  localMediaMuted: function () {
    return (Template.instance().localMuted.get())
  }
});

Template.videoChat.events({
  "click #js-preview-camera": function(event, template){
    event.preventDefault();
    if( ! template.localTracks){
      createLocalTracks(template).then(
        function(value){
          template.localMediaAttached.set(true);
        },
        function(error){
          console.error(error);
        }
      )
    }
  },
  "click #js-mute-local-media": function(event, template){
    event.preventDefault();
    var localMediaElement = document.getElementById("local-media");
    if( template.localTracks){
      muteTracks(template.localTracks);
      template.localMuted.set(true);
    }
  },
  "click #js-unmute-local-media": function(event, template){
    event.preventDefault();
    var localMediaElement = document.getElementById("local-media");
    if( template.localTracks){
      unmuteTracks(template.localTracks);
      template.localMuted.set(false);
    }
  },
  "submit #js-join-video-chat-room": function(event, template){
    event.preventDefault();
    let theLocalTracks;
    template.localMediaAttached.set(true);
    const roomName = event.target.text.value;
    let connectOptions = {
      name: roomName,
      logLevel: 'warn'
    }
    if ( template.localTracks ) {
      connectOptions.tracks = template.localTracks;
    }
    Video.connect(template.accessData.token, connectOptions)
    .then(
      function(room){
        roomJoined(room,template)
      },
      function(error) {
        console.error('Could not connect to Twilio: ' + error.message);
      }
    );
  }
});
