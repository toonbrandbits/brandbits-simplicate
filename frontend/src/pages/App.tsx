import React from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@stackframe/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, Building2, FolderOpen, BarChart3 } from "lucide-react";

export default function App() {
  const navigate = useNavigate();
  const user = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      {/* <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-amber-900">Brandbits uren bijhouden</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-amber-700">Welkom terug!</span>
                  <UserButton />
                </div>
              )}
            </div>
          </div>
        </div>
      </header> */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-amber-900 mb-6">
            BRANDBITS® Urenregistratie
          </h2>
          <p className="text-xl text-amber-700 max-w-3xl mx-auto leading-relaxed">
            Registreer je uren en maak een overzicht van je projecten.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-amber-200 bg-gradient-to-br from-white to-amber-50"
            onClick={() => navigate("/companies")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl w-fit mb-4">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl text-amber-900">Bedrijven</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-amber-700 mb-6">
                Beheer je klanten en business relaties in één plek.
              </p>
              <Button 
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/companies");
                }}
              >
                Beheer Bedrijven
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-emerald-200 bg-gradient-to-br from-white to-emerald-50"
            onClick={() => navigate("/projects")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl w-fit mb-4">
                <FolderOpen className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl text-emerald-900">Projecten</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-emerald-700 mb-6">
                Maak en organiseer projecten, wijs ze toe aan bedrijven, en stel beschikbare uren in.
              </p>
              <Button 
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/projects");
                }}
              >
                Beheer Projecten
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-blue-200 bg-gradient-to-br from-white to-blue-50"
            onClick={() => navigate("/time-tracking")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl w-fit mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl text-blue-900">Urenregistratie</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-blue-700 mb-6">
                Registreer uren met een kalender-gebaseerde tracking en slimme validatie om overruns te voorkomen.
              </p>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/time-tracking");
                }}
              >
                Registreer Uren
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto border-amber-200 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold text-amber-900 mb-4">
                Waarom kiezen voor Brandbits® Urenregistratie?
              </h3>
              <div className="grid gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-amber-500 rounded-full mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <p className="text-amber-800">
                    <strong>Slimme Validatie:</strong> Voorkom overruns met ingebouwde uurlimieten per project.
                  </p>
                </div>  
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-amber-500 rounded-full mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <p className="text-amber-800">
                    <strong>Georganiseerde Workflow:</strong> Verbind bedrijven met projecten voor duidelijke projecteigendom.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-amber-500 rounded-full mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <p className="text-amber-800">
                      <strong>Kalenderinterface:</strong> Intuïtieve datum-gebaseerde urenregistratie voor betere nauwkeurigheid.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
