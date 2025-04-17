import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronRight, ChevronLeft } from "lucide-react";
import BasicSetup from "./basic-setup";
import Intelligence from "./intelligence";
import Knowledge from "./knowledge";
import Behavior from "./behavior";

interface FormTabsProps {
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function FormTabs({ onSubmit, isSubmitting }: FormTabsProps) {
  const [activeTab, setActiveTab] = useState("basic");
  
  const tabs = [
    { id: "basic", label: "Basic Setup" },
    { id: "intelligence", label: "Intelligence" },
    { id: "knowledge", label: "Knowledge" },
    { id: "behavior", label: "Behavior" },
  ];

  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  const handleNext = () => {
    if (!isLastTab) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    } else {
      // Call form submission
      onSubmit();
      console.log("Submitting form on last tab");
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="border-b border-neutral-800 mb-6">
        <TabsList className="bg-transparent h-auto p-0 flex space-x-8">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-neutral-400 py-2 px-1 rounded-none transition-colors focus:outline-none focus-visible:ring-0"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="basic" className="m-0 pt-2">
        <BasicSetup />
      </TabsContent>
      
      <TabsContent value="intelligence" className="m-0 pt-2">
        <Intelligence />
      </TabsContent>
      
      <TabsContent value="knowledge" className="m-0 pt-2">
        <Knowledge />
      </TabsContent>
      
      <TabsContent value="behavior" className="m-0 pt-2">
        <Behavior />
      </TabsContent>

      <div className="flex justify-between mt-6 pt-4 border-t border-neutral-800">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstTab}
          className={`border-neutral-700 hover:bg-neutral-800 text-white ${isFirstTab ? 'opacity-50' : ''}`}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {isLastTab ? (
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              console.log("Save button clicked - direct submission");
              // Call onSubmit directly - this is the key fix
              onSubmit();
            }}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            {isSubmitting ? "Saving..." : "Save Chatbot"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </Tabs>
  );
}
