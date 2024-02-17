import { useRef, useState, useEffect } from "react";
import { socket } from '../../socket';
import "./index.css"

export default function Room({setJoined , localAudioTrack,
    localVideoTrack}) {
    const [recievedMessages, setRecievedMessages] = useState([]);
    const [sentMessages, setSentMessages] = useState([]);
    const [messageTBS, setMessageTBS] = useState('');
    const [lobby, setLobby] = useState(true);
    const [sendingPc, setSendingPc] = useState(null);
    const [receivingPc, setReceivingPc] = useState(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState(null); 
    const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState(null);
    const remoteVideoRef = useRef();
    const localVideoRef = useRef();

    const handleSend = () => {
        setSentMessages(prev=>[...prev, messageTBS]);
        console.log('sending Message');
            // socket.emit('message',messageTBS);
    }

    useEffect(()=>{
        socket.on('send-offer', (room_id) => {
            console.log("send offer triggered from server with room id alloted",room_id);
            const peerConnectionObject = new RTCPeerConnection();
            setSendingPc(peerConnectionObject);
            if (localVideoTrack) {
                console.error("added video track");
                console.log(localVideoTrack)
                peerConnectionObject.addTrack(localVideoTrack)
            }
            if (localAudioTrack) {
                console.error("added audio track");
                console.log(localAudioTrack)
                peerConnectionObject.addTrack(localAudioTrack)
            }
            // Gets ICE candiates and forwards it to the server with type 'sender' to send it to receiver
            peerConnectionObject.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('sending ice candidate');
                    socket.emit('room-ice-candidate', {
                        room_id,
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
                socket.emit('offer', {
                    room_id,
                    type: "sender",
                    sdp
                });
            }
        })

        socket.on('offer', async ({roomId, sdp: remoteSdp}) => {
            console.log("received offer", roomId);
            const peerConnectionObject = new RTCPeerConnection();
            peerConnectionObject.setRemoteDescription(remoteSdp)
            const localSdp = await peerConnectionObject.createAnswer();
            //@ts-ignore
            peerConnectionObject.setLocalDescription(localSdp)
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }
            peerConnectionObject.ontrack = (e) => {
                alert("ontrack");
                console.error("inside ontrack");
                const {track, type} = e;
                if (type == 'audio') {
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
                console.log("omn ice candidate on receiving seide");
                if (e.candidate) {
                   socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                   })
                }
            }


            //send Answer with its local sdp to remote SDP
            socket.emit("answer", {
                roomId,
                sdp: localSdp
            });
        })
        socket.on("answer", ({roomId, sdp: remoteSdp}) => {
            console.log("received answer", roomId);
            setLobby(false);
            setSendingPc(prevPC => {
                prevPC?.setRemoteDescription(remoteSdp)
                return prevPC;
            });
            console.log("loop closed");
        })

        socket.on("add-ice-candidate", ({candidate, type}) => {
            console.log("add ice candidate from remote");
            console.log({candidate, type})
            if (type == "sender") {
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
        })


    },[]);
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
                            <div>sent messages</div>
                            <div className="sent">{sentMessages.map(msg=><div>{msg}</div>)}</div>
                        </div>
                        <div className="recieved messages">
                            <div>recieved messages</div>
                            <div className="message">{recievedMessages.map(msg=><div>{msg}</div>)}</div>
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
                        <button onClick={(e)=>setJoined(false)}>
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}