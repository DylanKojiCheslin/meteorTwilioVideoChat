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

function detachTracks(tracks) {
  tracks.forEach(function(track) {
    track.detach().forEach(function(detachedElement) {
      detachedElement.remove();
    });
  });
}

function detachParticipantTracks(participant) {
  var tracks = Array.from(participant.tracks.values());
  detachTracks(tracks);
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
  template.inChatRoom.set(true);
  template.preview.set(false);

  room.participants.forEach(function(participant) {
    const remoteMediaElement = document.getElementById('remote-media');
    attachParticipantTracks(participant, remoteMediaElement);
  });

  room.on('trackAdded', function(track, participant) {
    const remoteMediaElement = document.getElementById('remote-media');
    attachTracksToDomElement([track], remoteMediaElement);
  });

  room.on('trackRemoved', function(track, participant) {
    detachTracks([track]);
  });

  room.on('participantDisconnected', function(participant) {
    detachParticipantTracks(participant);
  });

  room.on('disconnected', function() {
    if (template.localTracks) {
      template.localTracks.forEach(function(track) {
        track.stop();
      });
    }
    detachParticipantTracks(room.localParticipant);
    room.participants.forEach(detachParticipantTracks);
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
   this.localAudio = new ReactiveVar(null);
   this.localVideo = new ReactiveVar(null);
   this.preview = new ReactiveVar(null);
   this.inChatRoom =  new ReactiveVar(null);
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
   this.localAudio.set(true);
   this.localVideo.set(true);
   this.preview.set(false);
   this.inChatRoom.set(false);
});

Template.videoChat.helpers({
  theLocalMediaIsAttached: function () {
    return (Template.instance().localMediaAttached.get())
  },
  theLocalMediaAudioIsEnabled: function () {
    return (Template.instance().localAudio.get())
  },
  theLocalMediaVideoIsEnabled: function () {
    return (Template.instance().localVideo.get())
  },
  theUserIsInPreview: function(){
    return (Template.instance().preview.get())
  },
  theUserIsInChatRoom: function(){
    return (Template.instance().inChatRoom.get())
  }
});

Template.videoChat.onDestroyed(function (event, template) {
  event.preventDefault();
  if (template.room) {
    template.room.disconnect();
  }
});

Template.videoChat.events({
  "click #js-start-preview-local-media": function(event, template){
    event.preventDefault();
    if( ! template.localTracks){
      createLocalTracks(template).then(
        function(value){
          template.localMediaAttached.set(true);
          template.preview.set(true);
        },
        function(error){
          console.error(error);
        }
      )
    }
  },
  "click #js-end-preview-local-media": function(event, template){
    event.preventDefault();
    if (template.localTracks) {
      detachTracks(template.localTracks);
      template.localMediaAttached.set(false);
      template.preview.set(false);
    }
  },
  "click #js-mute-local-media": function(event, template){
    event.preventDefault();
    if( template.localTracks){
      const localMediaElement = document.getElementById("local-media");
      disableAudioTracks(template.localTracks);
      template.localAudio.set(false);
    }
  },
  "click #js-unmute-local-media": function(event, template){
    event.preventDefault();
    if( template.localTracks){
      const localMediaElement = document.getElementById("local-media");
      enableAudioTracks(template.localTracks);
      template.localAudio.set(true);
    }
  },
  "click #js-disable-video-local-media": function(event, template){
    event.preventDefault();
    const localMediaElement = document.getElementById("local-media");
    if (template.localTracks) {
      disableVideoTracks(template.localTracks);
      template.localVideo.set(false);
    }
  },
  "click #js-enable-video-local-media": function(event, template){
    event.preventDefault();
    const localMediaElement = document.getElementById("local-media");
    if (template.localTracks) {
      enableVideoTracks(template.localTracks);
      template.localVideo.set(true);
    }
  },
  "submit #js-join-chat-room": function(event, template){
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
        roomJoined(room,template);
        template.room = room;
      },
      function(error) {
        console.error('Could not connect to Twilio: ' + error.message);
      }
    );
  },
  "click #js-leave-chat-room": function(event, template){
    event.preventDefault();
    if (template.room) {
      template.room.disconnect();
      template.localTracks = undefined;
      template.localMediaAttached.set(false);
      template.inChatRoom.set(false);
    }
  }
});
