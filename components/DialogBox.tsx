interface DialogBoxProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function DialogBox({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
}: DialogBoxProps) {
    return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-lg text-black font-semibold mb-4">{title}</h2>
        <p className="mb-6 text-black">{message}</p>
        <div className="flex justify-end space-x-2">
            <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-gray-400"
            >
                {cancelText}
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
                {confirmText}
            </button>
        </div>
        </div>
    </div>
    );
}
