import { Loader2Icon } from "lucide-react";

const Loading = () => {
    return (
        <div className="fixed top-0 left-0 flex items-center justify-center h-screen w-screen bg-gray-950 bg-opacity-50 z-50">
            <Loader2Icon className="size-4 mr-2 animate-spin" />
        </div>
    );
};

export default Loading;
