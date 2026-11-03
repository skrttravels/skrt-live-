"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Search, Plus, Building2, Phone, Mail, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import api from "@/lib/api";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { useAuth } from "@/context/AuthContext";

export default function ClientsPage() {
  const { can } = useAuth();
  const [clientList, setClientList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/clients");
      if (data.success) {
        setClientList(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clientList.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => {
      const allSelected = filteredClients.every(c => prev.has(c._id));
      if (allSelected) return new Set();
      return new Set(filteredClients.map(c => c._id));
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/clients/${id}`);
      toast.success(`"${name}" deleted successfully`);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete client");
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected client(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    try {
      for (const id of selectedIds) {
        await api.delete(`/clients/${id}`);
        deleted++;
      }
      toast.success(`${deleted} client(s) deleted successfully`);
      setSelectedIds(new Set());
      fetchClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to delete clients (${deleted} deleted)`);
    } finally {
      setBulkDeleting(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Client Directory</h2>
            <p className="text-muted-foreground">Manage your business clients and their shipment history.</p>
          </div>
          <div className="flex items-center gap-2">
            {can('clients', 'delete') && selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
              >
                {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            {can('clients', 'delete') && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={filteredClients.length > 0 && filteredClients.every(c => selectedIds.has(c._id))}
                  onChange={toggleAll}
                  className="accent-rose-500 w-4 h-4"
                />
                <span className="text-xs">Select all</span>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
                className="pl-10 w-64 bg-secondary/10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {can('clients', 'create') && <AddClientDialog onClientAdded={fetchClients} />}
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-secondary/10 border-border/50" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card
                key={client._id}
                className={`border-border/50 bg-secondary/10 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all group ${
                  selectedIds.has(client._id) ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {can('clients', 'delete') && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(client._id)}
                          onChange={() => toggleSelection(client._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-rose-500 w-4 h-4"
                        />
                      )}
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                        <Building2 className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20 capitalize">
                      {client.status}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl mb-1">{client.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Contact: {client.contactPerson || "N/A"}</p>

                  {client.gstin && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1">
                      <Building2 className="w-4 h-4" /> GST: {client.gstin}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" /> {client.phone || "N/A"}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" /> {client.email || "No email provided"}
                    </div>
                    <div className="pt-4 border-t border-border/50 mt-4 flex justify-between items-center">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Shipments</span>
                      <span className="text-lg font-bold text-primary">{client.totalShipments || 0}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">View Invoices</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">Analytics</Button>
                    {can('clients', 'delete') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(client._id, client.name)}
                        disabled={deleting === client._id}
                        className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 border-rose-200"
                      >
                        {deleting === client._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
