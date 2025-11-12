import { useNavigate } from "react-router-dom";
import { Messages as MessagesComponent } from "@/components/shared/Messages";
import { BackButton } from "@/components/shared/BackButton";

const Messages = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <BackButton to="/guest/dashboard" label="Back to Dashboard" className="mb-6" />

        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        
        <MessagesComponent />
      </div>
    </div>
  );
};

export default Messages;
