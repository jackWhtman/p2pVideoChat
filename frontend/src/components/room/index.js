import { useEffect, useRef, useState } from "react";
import { socket } from "../../socket";

export default function Room({ name, joined, setJoined, localAudioTrack,
    localVideoTrack }) {
    const [recievedMessages, setRecievedMessages] = useState([]);
    const [sentMessages, setSentMessages] = useState([]);
    const [messageTBS, setMessageTBS] = useState('');
    const [lobby, setLobby] = useState(true);
    const [sendingPc, setSendingPc] = useState(null);
    const [receivingPc, setReceivingPc] = useState(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState(null);
    const senderDataChannelRef = useRef();
    const receiverDataChannelRef = useRef();
    const remoteVideoRef = useRef();
    const localVideoRef = useRef();


    const handleSend = () => {
        setSentMessages(prev => [...prev, messageTBS]);
        console.log('sending Message');
        console.log('dataChannel',senderDataChannelRef.current)
        const dataChannel = senderDataChannelRef.current;
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(messageTBS);
            setMessageTBS('');
        } else {
            console.log('Data channel not ready to send message.');
        }
    };


    
    const sendOfferhandler = ({ roomId }) => {
        console.log("send offer triggered from server with room id alloted", roomId);
        const peerConnectionObject = new RTCPeerConnection();
        senderDataChannelRef.current = peerConnectionObject.createDataChannel('chat');
        setSendingPc(peerConnectionObject);
        peerConnectionObject.oniceconnectionstatechange = e => console.log("sending user.iceConnState:", peerConnectionObject.iceConnectionState);
        if (localVideoTrack) {
            console.log("added video track");
            // console.log(localVideoTrack)
            peerConnectionObject.addTrack(localVideoTrack)
        }
        if (localAudioTrack) {
            console.log("added audio track");
            // console.log(localAudioTrack)
            peerConnectionObject.addTrack(localAudioTrack)
        }
        // Gets ICE candiates and forwards it to the server with type 'sender' to send it to receiver
        peerConnectionObject.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('sending ice candidate');
                socket.emit('room-ice-candidate', {
                    roomId,
                    type: "sender",
                    candidate: event.candidate
                });
            }
        }
        // This code sets up a callback function for when a negotiation is needed in a WebRTC peer connection.
        //  It logs a message,
        //  creates an offer,
        //  sets the local description,
        //  and emits an 'offer' event with the offer details to a socket.
        peerConnectionObject.onnegotiationneeded = async () => {
            console.log("on negotiation needed, sending offer");
            const sdp = await peerConnectionObject.createOffer();
            await peerConnectionObject.setLocalDescription(sdp);
            console.log("sending offer with own sdp");
            socket.emit('offer', {
                roomId,
                sdp
            });
        }
    }

    const offerHandler = async ({ roomId, sdp: remoteSdp }) => {
        console.log("received offer", roomId, socket.id);
        const peerConnectionObject = new RTCPeerConnection();

        receiverDataChannelRef.current = peerConnectionObject.createDataChannel('chat');


        const stream = new MediaStream();
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
        }
        peerConnectionObject.ontrack = (e) => {
            console.log("inside ontrack");
            const { track, kind } = e;
            if (kind === 'audio') {
                setRemoteAudioTrack(track);
                remoteVideoRef.current.srcObject.addTrack(track)
            } else {
                setRemoteVideoTrack(track);
                remoteVideoRef.current.srcObject.addTrack(track)
            }
            remoteVideoRef.current.play();
        }

        setRemoteMediaStream(stream);
        // trickle ice 
        setReceivingPc(peerConnectionObject);
        window.pcr = peerConnectionObject;
        peerConnectionObject.onicecandidate = async (e) => {
            if (!e.candidate) {
                return;
            }
            console.log("on ice candidate on receiving side");
            if (e.candidate) {
                socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                })
            }
        }

        await peerConnectionObject.setRemoteDescription(remoteSdp);
        const localSdp = await peerConnectionObject.createAnswer();
        await peerConnectionObject.setLocalDescription(localSdp)

        //send Answer with its local sdp to remote SDP
        console.log("sending answer with", roomId, localSdp)
        socket.emit("answer", {
            roomId,
            sdp: localSdp
        });
    }

    const answerHandler = ({ roomId, sdp: remoteSdp }) => {
        console.log("received answer and now out of lobby", roomId, remoteSdp);
        setLobby(false);
        setSendingPc(prevPC => {
            if (prevPC.connectionState !== 'closed') {
                prevPC?.setRemoteDescription(remoteSdp)
            }
            return prevPC;
        });
        console.log("loop closed");
    }

    const inLobbyHandler = () => {
        console.log("is in lobby");
        setLobby(true);
    }

    const addIceCandidateHandler = ({ candidate, type }) => {
        console.log("add ice candidate from remote");
        console.log({ candidate, type })
        if (type === "sender") {
            setReceivingPc(prevPC => {
                if (!prevPC) {
                    console.error("receiving pc not found")
                } else {
                    console.error(prevPC.ontrack)
                }
                prevPC?.addIceCandidate(candidate)
                return prevPC;
            });
        } else {
            setSendingPc(prevPC => {
                if (!prevPC) {
                    console.error("sending pc not found")
                } else {
                    // console.error(pc.ontrack)
                }
                prevPC?.addIceCandidate(candidate)
                return prevPC;
            });
        }
    }
    useEffect(() => {
        socket.on('send-offer', sendOfferhandler)
        socket.on('offer', offerHandler)
        socket.on("answer", answerHandler)
        socket.on("lobby", inLobbyHandler)
        socket.on("add-ice-candidate", addIceCandidateHandler)
        return () => {
            socket.off('send-offer', sendOfferhandler);
            socket.off('offer', offerHandler);
            socket.off('answer', answerHandler);
            socket.off('lobby', inLobbyHandler);
            socket.off('add-ice-candidate', addIceCandidateHandler);
        };
    }, []);

    useEffect(() => {
        const dataChannel = senderDataChannelRef.current;
        if (dataChannel.current) {
            // Set up event listeners for the data channel
            dataChannel.onopen = () => {
                console.log('Data channel is open');
            };
            dataChannel.onmessage = (event) => {
                const receivedMessage = event.data;
                console.log('Received message:', receivedMessage);
                // Handle the received message
            };
            // Clean up data channel on component unmount
            return () => {
                dataChannel.close();
            };
        }
    }, [senderDataChannelRef.current]);

    useEffect(() => {
        const dataChannel = receiverDataChannelRef.current;
        if (dataChannel.current) {
            // Set up event listeners for the data channel
            dataChannel.onopen = () => {
                console.log('Data channel is open');
            };
            dataChannel.onmessage = (event) => {
                const receivedMessage = event.data;
                console.log('Received message:', receivedMessage);
                // Handle the received message
            };
            // Clean up data channel on component unmount
            return () => {
                dataChannel.close();
            };
        }
    }, [receiverDataChannelRef.current]);

    useEffect(() => {
        if (localVideoRef.current && localAudioTrack && localVideoTrack) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack, localAudioTrack]);
            localVideoRef.current.addEventListener('loadedmetadata', () => {
                localVideoRef.current.play();
            });
        }
    }, [localAudioTrack, localVideoRef, localVideoTrack]);

    useEffect(() => {
        if (!lobby && remoteVideoRef.current && remoteAudioTrack && remoteVideoTrack) {
            remoteVideoRef.current.srcObject = new MediaStream([remoteVideoTrack, remoteAudioTrack]);
            remoteVideoRef.current.addEventListener('loadedmetadata', () => {
                remoteVideoRef.current.play();
            });

        }
    }, [remoteAudioTrack, remoteVideoRef, remoteVideoTrack, lobby]);

    console.log("room rendered");

    return (
        <div className="room">
            <div className="main">
                <div className="video">
                    <video className="local videoBox" autoPlay ref={localVideoRef}></video>
                    <video className="remote videoBox" autoPlay ref={remoteVideoRef}></video>
                </div>
                <div className="video">
                    <div className="messageBox">
                        <div className="sent messages">
                            <div> {name} messages</div>
                            <div className="sent">{sentMessages.map(msg => <div>{msg}</div>)}</div>
                        </div>
                        <div className="recieved messages">
                            <div>recieved messages</div>
                            <div className="message">{recievedMessages.map(msg => <div>{msg}</div>)}</div>
                        </div>
                    </div>
                    <div className="sendMessage">
                        <input type="text" placeholder={'Enter your message'} onChange={(e) => {
                            setMessageTBS(e.target.value);
                        }}>
                        </input>
                        <button onClick={handleSend}>
                            Send
                        </button>
                        <button onClick={(e) => setJoined(false)}>
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}