import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Messages as MessagesComponent } from "@/components/shared/Messages";
import { ArrowLeft } from "lucide-react";

const Messages = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        
        <MessagesComponent />
      </div>
    </div>
  );
};

export default Messages;

