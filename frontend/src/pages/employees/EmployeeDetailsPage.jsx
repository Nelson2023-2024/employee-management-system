import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../../components/ui/card";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  Loader2, 
  User,
  Mail,
  Phone,
  Building,
  DollarSign,
  Calendar,
  Badge
} from "lucide-react";
import { useGetEmployee, useUpdateEmployee, useDeleteEmployee } from "../../hooks/useEmployees.js";
import { useDepartments } from "../../hooks/useDepartments";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

const EmployeeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: authUser } = useAuth();
  const { employee, isLoading: fetchingEmployee } = useGetEmployee(id);
  const { updateEmployee, isLoading: updating } = useUpdateEmployee();
  const { deleteEmployee, isLoading: deleting } = useDeleteEmployee();
  const { data: departmentsData } = useDepartments();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phoneNumber: "",
    position: "",
    departmentName: "",
    basicSalary: "",
    employeeStatus: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const isAdmin = authUser?.role === "admin";

  // Update form data when employee data is loaded
  useEffect(() => {
    if (employee) {
      setFormData({
        email: employee.email || "",
        fullName: employee.fullName || "",
        phoneNumber: employee.phoneNumber || "",
        position: employee.position || "",
        departmentName: employee.department?.name || "",
        basicSalary: employee.basicSalary?.toString() || "",
        employeeStatus: employee.employeeStatus || "Active",
      });
    }
  }, [employee]);

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!formData.fullName.trim()) errors.fullName = "Full Name is required";
    if (!formData.phoneNumber.trim()) errors.phoneNumber = "Phone Number is required";
    if (!formData.position.trim()) errors.position = "Position is required";
    if (!formData.departmentName.trim()) errors.departmentName = "Department is required";
    if (formData.basicSalary === "" || isNaN(formData.basicSalary) || parseFloat(formData.basicSalary) < 0) {
      errors.basicSalary = "Basic Salary must be a positive number";
    }
    if (!formData.employeeStatus.trim()) errors.employeeStatus = "Employee status is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormErrors(prev => ({
      ...prev,
      [name]: undefined
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormErrors(prev => ({
      ...prev,
      [name]: undefined
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    updateEmployee(
      { id, data: { ...formData, basicSalary: Number(formData.basicSalary) } },
      {
        onSuccess: () => {
          setIsEditing(false);
          setFormErrors({});
          toast.success("Employee updated successfully!");
        },
      }
    );
  };

  const handleDelete = () => {
    deleteEmployee(id, {
      onSuccess: () => {
        toast.success("Employee deleted successfully!");
        navigate("/employees");
      },
    });
  };

  const handleCancel = () => {
    if (employee) {
      setFormData({
        email: employee.email || "",
        fullName: employee.fullName || "",
        phoneNumber: employee.phoneNumber || "",
        position: employee.position || "",
        departmentName: employee.department?.name || "",
        basicSalary: employee.basicSalary?.toString() || "",
        employeeStatus: employee.employeeStatus || "Active",
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  if (fetchingEmployee) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading employee details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Employee Not Found</h3>
            <p className="text-gray-600 mb-4">The requested employee could not be found.</p>
            <Button onClick={() => navigate("/employees")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusOptions = ["Active", "On Leave", "Inactive"];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/employees")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Employee Details</h1>
            <p className="text-gray-600">
              {isEditing ? "Edit employee information" : "View employee information"}
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Employee
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Employee
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Employee Profile Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-2xl">
              {employee.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{employee.fullName}</h2>
              <p className="text-gray-600 text-lg">{employee.position}</p>
              <div className="flex items-center gap-4 mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    employee.employeeStatus === "Active"
                      ? "bg-green-100 text-green-800"
                      : employee.employeeStatus === "On Leave"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {employee.employeeStatus}
                </span>
                <span className="text-sm text-gray-500">
                  ID: {employee._id}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Employee Information
          </CardTitle>
          <CardDescription>
            {isEditing ? "Modify the employee details below" : "Employee details and information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
                {formErrors.fullName && <p className="text-red-500 text-sm">{formErrors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
                {formErrors.email && <p className="text-red-500 text-sm">{formErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
                {formErrors.phoneNumber && <p className="text-red-500 text-sm">{formErrors.phoneNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="flex items-center gap-2">
                  <Badge className="h-4 w-4" />
                  Position
                </Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
                {formErrors.position && <p className="text-red-500 text-sm">{formErrors.position}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Department
                </Label>
                <Select 
                  value={formData.departmentName} 
                  onValueChange={(value) => handleSelectChange("departmentName", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentsData?.departments?.map((dept) => (
                      <SelectItem key={dept._id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.departmentName && <p className="text-red-500 text-sm">{formErrors.departmentName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="basicSalary" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Basic Salary
                </Label>
                <Input
                  id="basicSalary"
                  name="basicSalary"
                  type="number"
                  value={formData.basicSalary}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
                {formErrors.basicSalary && <p className="text-red-500 text-sm">{formErrors.basicSalary}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeStatus" className="flex items-center gap-2">
                  <Badge className="h-4 w-4" />
                  Employee Status
                </Label>
                <Select 
                  value={formData.employeeStatus} 
                  onValueChange={(value) => handleSelectChange("employeeStatus", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.employeeStatus && <p className="text-red-500 text-sm">{formErrors.employeeStatus}</p>}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Joined
                </Label>
                <Input
                  value={new Date(employee.createdAt).toLocaleDateString()}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Additional Information */}
            {employee.updatedAt && employee.updatedAt !== employee.createdAt && (
              <div className="pt-4 border-t">
                <Label className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Last Updated: {new Date(employee.updatedAt).toLocaleDateString()}
                </Label>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{employee?.fullName}</strong>? 
              This action cannot be undone and will remove all associated data including:
              <br />
              <br />
              • Employee profile and personal information
              <br />
              • Attendance records
              <br />
              • Leave requests and history
              <br />
              • Payroll information
              <br />
              <br />
              This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Employee
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeDetailsPage;