"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertCircle, HelpCircle, Info } from "lucide-react";

type AlertType = "success" | "error" | "warning" | "info" | "confirm";

interface AlertOptions {
  title?: string;
  description: string;
  type?: AlertType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = (newOptions: AlertOptions) => {
    setOptions(newOptions);
    setOpen(true);
  };

  const handleConfirm = () => {
    setOpen(false);
    if (options?.onConfirm) options.onConfirm();
  };

  const handleCancel = () => {
    setOpen(false);
    if (options?.onCancel) options.onCancel();
  };

  const getTypeStyles = () => {
    switch (options?.type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />,
          titleColor: "text-emerald-700 dark:text-emerald-400",
          btnColor: "bg-emerald-600 hover:bg-emerald-700",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-500 mb-2" />,
          titleColor: "text-red-700 dark:text-red-400",
          btnColor: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          icon: <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />,
          titleColor: "text-amber-700 dark:text-amber-400",
          btnColor: "bg-amber-600 hover:bg-amber-700",
        };
      case "confirm":
        return {
          icon: <HelpCircle className="w-12 h-12 text-blue-500 mb-2" />,
          titleColor: "text-blue-700 dark:text-blue-400",
          btnColor: "bg-blue-600 hover:bg-blue-700",
        };
      default:
        return {
          icon: <Info className="w-12 h-12 text-slate-500 mb-2" />,
          titleColor: "text-slate-800 dark:text-slate-200",
          btnColor: "bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm border-none shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-slate-900/95 dark:backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-col items-center text-center">
            {styles.icon}
            <AlertDialogTitle className={`text-xl font-bold ${styles.titleColor}`}>
              {options?.title || (options?.type === "confirm" ? "ยืนยันการทำรายการ" : "แจ้งเตือนระบบ")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              {options?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 mt-6 sm:justify-center">
            {options?.type === "confirm" && (
              <AlertDialogCancel
                onClick={handleCancel}
                className="flex-1 rounded-xl h-11 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 transition-all font-bold"
              >
                {options.cancelText || "ยกเลิก"}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={handleConfirm}
              className={`flex-1 rounded-xl h-11 text-white shadow-lg transition-all font-bold active:scale-95 ${styles.btnColor}`}
            >
              {options?.confirmText || (options?.type === "confirm" ? "ยืนยัน" : "ตกลง")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};
