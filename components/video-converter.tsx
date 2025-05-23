"use client";

import { useState, useEffect, useRef } from "react"; // Added useRef
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import $api from "@/lib/http";
import { Clip } from "@/types";
import { ClipResults } from "./clip-results";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CustomProgress } from "./custom-progress";

const FILLER_OPTIONS = [
  { value: "gta5", label: "GTA 5", icon: "/icons/gta-5.png" },
  {
    value: "minecraft",
    label: "Minecraft Parkour",
    icon: "/icons/minecraft-parkour.png",
  },
  {
    value: "press",
    label: "Hydraulic Press",
    icon: "/icons/hydraulic-press.png",
  },
  { value: "truck", label: "Cluster Truck", icon: "/icons/cluster-truck.png" },
  { value: "steep", label: "Steep", icon: "/icons/steep.png" },
  { value: "random", label: "Random", icon: "/icons/random.png" },
  {
    value: "crossy_road",
    label: "Crossy Road",
    icon: "/icons/image.png",
    premiumOnly: true,
  },
  {
    value: "asmr",
    label: "ASMR Cutting",
    icon: "/icons/unnamed.png",
    premiumOnly: true,
  },
  {
    value: "subway_surf",
    label: "Subway Surfers",
    icon: "/icons/unnamed (1).png",
    premiumOnly: true,
  },
];

export function VideoConverter() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [filler, setFiller] = useState("random");
  const [numberOfClips, setNumberOfClips] = useState(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, tier, hasOneFreeConversion, login } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null); // Ref to store AbortController

  const maxClips = tier === "PREMIUM" ? 5 : tier === "PRO" ? 3 : 1;

  useEffect(() => {
    if (tier === "FREE") {
      setNumberOfClips(1);
    } else if (numberOfClips > maxClips) {
      setNumberOfClips(maxClips);
    }
  }, [tier, maxClips, numberOfClips]);

  useEffect(() => {
    if (isLoading) {
      const minTime = numberOfClips * 60;
      const maxTime = numberOfClips * 120;
      setEstimatedTime(`~${minTime}–${maxTime} seconds`);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 100 / (minTime * 2);
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoading, numberOfClips]);

  const syncUserData = async () => {
    try {
      console.log("[VideoConverter] Synchronizing user data after conversion");
      const res = await $api.get("/user/me");
      const { email, tier, hasOneFreeConversion } = res.data;
      console.log(res.data);

      localStorage.setItem("userEmail", email);
      localStorage.setItem("tier", tier);
      localStorage.setItem(
        "hasOneFreeConversion",
        String(hasOneFreeConversion)
      );
      await login(
        localStorage.getItem("accessToken")!,
        localStorage.getItem("refreshToken")!,
        email,
        tier,
        hasOneFreeConversion
      );
    } catch (error: any) {
      console.error(
        "[VideoConverter] Error synchronizing user data:",
        error.response?.data || error.message
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to synchronize user data. Please log in again.",
      });
      router.push("/login");
    }
  };

  const handleConvert = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Not Authorized",
        description: "Please log in to continue.",
      });
      router.push("/login");
      return;
    }

    if (tier === "FREE" && hasOneFreeConversion === false) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "You have used your free conversion. Please select a paid plan.",
      });
      router.push("/pricing");
      return;
    }

    if (!youtubeUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a YouTube video URL",
      });
      return;
    }

    const selectedFiller = FILLER_OPTIONS.find((opt) => opt.value === filler);
    if (selectedFiller?.premiumOnly && tier !== "PREMIUM") {
      toast({
        variant: "destructive",
        title: "Premium Feature",
        description: "This filler option is available only for Premium users.",
      });
      router.push("/pricing");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    abortControllerRef.current = new AbortController(); // Create new AbortController

    try {
      const res = await $api.post(
        "/create",
        {
          youtubeURL: youtubeUrl,
          filler,
          numberOfClips,
        },
        { signal: abortControllerRef.current.signal } // Pass AbortController signal
      );
      console.log("Conversion response:", res.data);
      setClips(res.data);

      await syncUserData();

      setProgress(100);
      toast({
        title: "Success",
        description: "Clips successfully generated!",
      });
      setYoutubeUrl("");
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Conversion aborted by user");
        toast({
          title: "Cancelled",
          description: "Video generation was cancelled.",
        });
      } else {
        console.error(
          "Conversion error:",
          err.response?.data.error || err.message
        );
        const errorMessage =
          err.response?.data?.error || "Failed to generate clips";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });

        await syncUserData();
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null; // Clean up AbortController
    }
  };

  // Handler for when the user tries to close the dialog
  const handleDialogOpenChange = (open: boolean) => {
    if (!open && isLoading) {
      const confirmClose = window.confirm(
        "Are you sure you want to stop generating videos?"
      );
      if (confirmClose) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort(); // Abort the API call
        }
        setIsLoading(false); // Close the dialog
      }
      // If user cancels, do nothing (dialog stays open)
    }
  };

  // Обработчик клика на слайдер
  const handleSliderClick = () => {
    if (tier === "FREE") {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "Free tier is limited to 1 clip. Upgrade to Pro or Premium to create up to 3 or 5 clips!",
      });
    }
  };

  return (
    <div className="flex flex-col">
      <div className="relative max-w-4xl mx-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-75" />
        <div className="relative bg-background border rounded-lg p-2">
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              type="text"
              placeholder="Paste YouTube video URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={
                isLoading || (tier === "FREE" && hasOneFreeConversion === false)
              }
              className="flex-1 text-lg py-3 md:py-6"
            />
            <Select
              value={filler}
              onValueChange={setFiller}
              disabled={
                isLoading || (tier === "FREE" && hasOneFreeConversion === false)
              }
            >
              <SelectTrigger className="w-full md:w-[200px] h-full">
                <SelectValue placeholder="Select filler" />
              </SelectTrigger>
              <SelectContent>
                {FILLER_OPTIONS.map((option, index) => (
                  <SelectItem
                    key={index}
                    value={option.value}
                    disabled={option.premiumOnly && tier !== "PREMIUM"}
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={option.icon}
                        alt={option.label}
                        width={32}
                        height={32}
                      />
                      <span>{option.label}</span>
                      {option.premiumOnly && (
                        <span className="ml-2 text-xs text-primary">
                          (Premium)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-full md:w-[160px] flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">
                Number of clips: {numberOfClips}
              </label>
              <Slider
                value={[numberOfClips]}
                onValueChange={(value) => setNumberOfClips(value[0])}
                min={1}
                max={tier === "FREE" ? 1 : maxClips}
                step={1}
                disabled={
                  isLoading ||
                  (tier === "FREE" && hasOneFreeConversion === false) ||
                  tier === "FREE"
                }
                onClick={handleSliderClick}
                className="w-full cursor-pointer"
              />
            </div>
            {!isAuthenticated ? (
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Login
              </Button>
            ) : tier === "FREE" && hasOneFreeConversion === false ? (
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Select Plan
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? "Processing..." : "Get Clips"}
                {!isLoading &&
                  !(tier === "FREE" && hasOneFreeConversion === false) && (
                    <ArrowRight className="ml-2 h-5 w-5" />
                  )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isAuthenticated ? (
        <p className="text-center text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
          You are not logged in. Please log in and select a plan on the pricing page.
        </p>
      ) : tier === "FREE" && hasOneFreeConversion === false ? (
        <p className="text-center text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
          You have used your free conversion. Unlock more features by selecting a plan on the pricing page.
        </p>
      ) : null}

      <Dialog open={isLoading} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generating Clips</DialogTitle>
            <DialogDescription>
              Please wait while we process your video. Estimated time: {estimatedTime}
            </DialogDescription>
          </DialogHeader>
          <CustomProgress value={progress} className="w-full" />
        </DialogContent>
      </Dialog>

      <ClipResults clips={clips} />
    </div>
  );
}