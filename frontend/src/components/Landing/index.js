import { useEffect, useRef, useState } from "react"
import { socket } from '../../socket';
import "./index.css"
import Room from "../room";

export default function Landing() {
    const [name, setName] = useState("");
    const [joined, setJoined] = useState(false);
    const videoRef = useRef(null);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setlocalVideoTrack] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);

    const getMediaInput = async () => {
        try{
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];
            setLocalAudioTrack(audioTrack);
            setlocalVideoTrack(videoTrack);
            if(!videoRef.current){
                return;
            }
            videoRef.current.srcObject = new MediaStream([videoTrack, audioTrack]);
            videoRef.current.addEventListener('loadedmetadata', () => {
                videoRef.current.play();
              });
        }catch(e){
            console.log(e);
        }
    }
    

     useEffect(() => {
        console.log("called");
         if(videoRef.current) {
             getMediaInput();
         }
     },[]) ;

     console.log("landing rendered");
    if(!joined)
        return (
         <div className="landing">
            <video className="videoBox" autoPlay ref={videoRef}></video>
            <div>
            <input type="text" onChange={(e) => {
                setName(e.target.value);
            }}>
            </input>
            <button onClick={() => {
                socket.connect();
                socket.emit('joined',name);
                setJoined(true);
            }}>Join</button>
            </div>
         </div>
        );
    return <Room 
                name={name}
                joined={joined}
                setJoined={setJoined} 
                socket={socket}
                localAudioTrack={localAudioTrack} 
                localVideoTrack={localVideoTrack}
            />
        
}