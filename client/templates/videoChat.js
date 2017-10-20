import Video from 'twilio-video';

function attachTracksToDomElement(tracks, domElement) {
  tracks.forEach(function(track) {
    domElement.appendChild(track.attach());
  });
}

function attachParticipantTracks(participant, domElement) {
  const tracks = Array.from(participant.tracks.values());
  attachTracksToDomElement(tracks, domElement);
}

function disableAudioTracks(tracks) {
  tracks.forEach(function(track) {
    if (track.kind == "audio") {
      track.disable();
    }
  });
}

function enableAudioTracks(tracks) {
  tracks.forEach(function(track) {
    if (track.kind == "audio") {
      track.enable();
    }
  });
}

function disableVideoTracks(tracks) {
  tracks.forEach(function(track) {
    if (track.kind == "video") {
      track.disable();
    }
  });
}

function enableVideoTracks(tracks) {
  tracks.forEach(function(track) {
    if (track.kind == "video") {
      track.enable();
    }
  });
}

function roomJoined(room, template){
  if (! template.localTracks) {
    const localMediaElement = document.getElementById("local-media");
    attachTracksToDomElement(room.localParticipant.tracks, localMediaElement);
    template.localTracks = room.localParticipant.tracks;
    template.localMediaAttached.set(true);
  }

  room.participants.forEach(function(participant) {
    const remoteMediaElement = document.getElementById('remote-media');
    attachParticipantTracks(participant, remoteMediaElement);
  });

  room.on('trackAdded', function(track, participant) {
    const remoteMediaElement = document.getElementById('remote-media');
    attachTracksToDomElement([track], remoteMediaElement);
  });

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
   this.localAudioEnabled = new ReactiveVar(null);
   this.localVideoEnabled = new ReactiveVar(null);
   this.previewModeEnabled = new ReactiveVar(null);
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
   this.localAudioEnabled.set(true);
   this.localVideoEnabled.set(true);
   this.previewModeEnabled.set(false)
});

Template.videoChat.helpers({
  localMediaAttachedMode: function () {
    return (Template.instance().localMediaAttached.get())
  },
  localMediaAudioEnabled: function () {
    return (Template.instance().localAudioEnabled.get())
  },
  localMediaVideoEnabled: function () {
    return (Template.instance().localVideoEnabled.get())
  },
  inPreviewMode: function(){
    return (Template.instance().previewModeEnabled.get())
  }
});

Template.videoChat.events({
  "click #js-start-preview-local-media": function(event, template){
    event.preventDefault();
    if( ! template.localTracks){
      createLocalTracks(template).then(
        function(value){
          template.localMediaAttached.set(true);
          template.previewModeEnabled.set(true);
        },
        function(error){
          console.error(error);
        }
      )
    }
  },
  "click #js-mute-local-media": function(event, template){
    event.preventDefault();
    if( template.localTracks){
      const localMediaElement = document.getElementById("local-media");
      disableAudioTracks(template.localTracks);
      template.localAudioEnabled.set(false);
    }
  },
  "click #js-unmute-local-media": function(event, template){
    event.preventDefault();
    if( template.localTracks){
      const localMediaElement = document.getElementById("local-media");
      enableAudioTracks(template.localTracks);
      template.localAudioEnabled.set(true);
    }
  },
  "click #js-disable-video-local-media": function(event, template){
    event.preventDefault();
    const localMediaElement = document.getElementById("local-media");
    if (template.localTracks) {
      disableVideoTracks(template.localTracks);
      template.localVideoEnabled.set(false);
    }
  },
  "click #js-enable-video-local-media": function(event, template){
    event.preventDefault();
    const localMediaElement = document.getElementById("local-media");
    if (template.localTracks) {
      enableVideoTracks(template.localTracks);
      template.localVideoEnabled.set(true);
    }
  },
  "submit #js-join-video-chat-room": function(event, template){
    event.preventDefault();
    let theLocalTracks;
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
