import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface MonthFilterProps {
  availableMonths: string[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export function MonthFilter({ availableMonths, selectedMonth, onSelectMonth }: MonthFilterProps) {
  if (availableMonths.length === 0) return null;

  return (
    <div className="flex overflow-x-auto p-4 gap-2 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 scrollbar-hide">
      <Button
        variant={selectedMonth === "all" ? "default" : "outline"}
        className={`whitespace-nowrap rounded-full h-8 px-4 text-xs shadow-sm transition-all ${
          selectedMonth === "all" 
            ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900" 
            : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
        }`}
        onClick={() => onSelectMonth("all")}
        size="sm"
      >
        ดูทั้งหมด
      </Button>
      {availableMonths.map((monthStr) => {
        const [year, month] = monthStr.split("-");
        const monthName = format(new Date(Number(year), Number(month) - 1), "MMMM yyyy", { locale: th });
        const isSelected = selectedMonth === monthStr;
        return (
          <Button
            key={monthStr}
            variant={isSelected ? "default" : "outline"}
            className={`whitespace-nowrap rounded-full h-8 px-4 text-xs shadow-sm transition-all ${
              isSelected 
                ? "bg-blue-600 dark:bg-blue-500 text-white" 
                : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            }`}
            onClick={() => onSelectMonth(monthStr)}
            size="sm"
          >
            {monthName}
          </Button>
        );
      })}
    </div>
  );
}
