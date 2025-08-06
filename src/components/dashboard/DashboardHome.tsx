import React, { useState, useEffect } from 'react';
import { useGym } from '../../contexts/GymContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  UserPlus,
  Filter,
  X
} from 'lucide-react';

interface DashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  expiringSubscribers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalRevenue: number;
  subscriptionRevenue: number;
  salesRevenue: number;
  salesProfit: number;
  totalSales: number;
  singleSessionRevenue: number;
  singleSessionCount: number;
}

const DashboardHome: React.FC = () => {
  const { gymId, gymName, gymType } = useGym();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    expiringSubscribers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalRevenue: 0,
    subscriptionRevenue: 0,
    salesRevenue: 0,
    salesProfit: 0,
    totalSales: 0,
    singleSessionRevenue: 0,
    singleSessionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states - simplified to date range only
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadDashboardStats();
  }, [gymId, startDate, endDate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.target || (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        navigate('/dashboard/sales');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      let dateCondition = '';
      let dateParams: any[] = [];

      // Build date condition for date range filter
      if (startDate && endDate) {
        dateCondition = "AND DATE(created_at) BETWEEN ? AND ?";
        dateParams = [startDate, endDate];
      }

      // Get subscribers stats
      const subscribersData = await window.electronAPI.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'expiring' THEN 1 ELSE 0 END) as expiring
        FROM subscribers 
        WHERE gym_id = ? ${dateCondition}
      `, [gymId, ...dateParams]);

      // Get products stats
      const productsData = await window.electronAPI.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN male_gym_quantity + female_gym_quantity < 5 THEN 1 ELSE 0 END) as low_stock
        FROM products
      `);

      // Get sales data (excluding single sessions)
      const salesData = await window.electronAPI.query(`
        SELECT 
          COUNT(DISTINCT i.id) as total_sales,
          COALESCE(SUM(i.total), 0) as revenue,
          COALESCE(SUM(i.profit), 0) as profit
        FROM invoices i
        WHERE i.gym_id = ? AND i.is_single_session = 0 ${dateCondition}
      `, [gymId, ...dateParams]);

      // Get single session data
      const singleSessionData = await window.electronAPI.query(`
        SELECT 
          COUNT(*) as session_count,
          COALESCE(SUM(total), 0) as revenue
        FROM invoices 
        WHERE gym_id = ? AND is_single_session = 1 ${dateCondition}
      `, [gymId, ...dateParams]);

      // Get subscription revenue
      const subscriptionRevenue = await window.electronAPI.query(`
        SELECT COALESCE(SUM(price_paid), 0) as revenue
        FROM subscribers 
        WHERE gym_id = ? ${dateCondition}
      `, [gymId, ...dateParams]);

      // Get internal sales profit
      const internalSalesProfit = await window.electronAPI.query(`
        SELECT 
          COALESCE(SUM(profit), 0) as profit
        FROM internal_sales
        WHERE gym_id = ? ${dateCondition}
      `, [gymId, ...dateParams]);

      const totalProfit = (salesData[0]?.profit || 0) + (internalSalesProfit[0]?.profit || 0);
      const totalRevenue = (salesData[0]?.revenue || 0) + (subscriptionRevenue[0]?.revenue || 0) + (singleSessionData[0]?.revenue || 0);

      setStats({
        totalSubscribers: subscribersData[0]?.total || 0,
        activeSubscribers: subscribersData[0]?.active || 0,
        expiringSubscribers: subscribersData[0]?.expiring || 0,
        totalProducts: productsData[0]?.total || 0,
        lowStockProducts: productsData[0]?.low_stock || 0,
        totalRevenue: totalRevenue,
        subscriptionRevenue: subscriptionRevenue[0]?.revenue || 0,
        salesRevenue: salesData[0]?.revenue || 0,
        salesProfit: totalProfit,
        totalSales: salesData[0]?.total_sales || 0,
        singleSessionRevenue: singleSessionData[0]?.revenue || 0,
        singleSessionCount: singleSessionData[0]?.session_count || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="card-ar">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 arabic-text">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 arabic-text">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            لوحة التحكم - {gymName}
          </h1>
          <p className="text-gray-600 arabic-text">
            نظرة عامة على أداء النادي الرياضي
          </p>
        </div>

        <div className="flex items-center space-x-reverse space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary-ar arabic-text flex items-center"
          >
            <Filter className="w-5 h-5 ml-2" />
            فلترة الفترة الزمنية
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      {showFilters && (
        <div className="card-ar">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold arabic-text">فلترة الإحصائيات حسب الفترة الزمنية</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group-ar">
              <label className="form-label-ar arabic-text">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input-ar"
              />
            </div>
            <div className="form-group-ar">
              <label className="form-label-ar arabic-text">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input-ar"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn-secondary-ar arabic-text w-full"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-green-500"
          subtitle="جميع المصادر"
        />
        
        <StatCard
          title="إيرادات الاشتراكات"
          value={formatCurrency(stats.subscriptionRevenue)}
          icon={<CreditCard className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          subtitle="اشتراكات شهرية وجلسات"
        />
        
        <StatCard
          title="إيرادات المبيعات"
          value={formatCurrency(stats.salesRevenue)}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          subtitle="مبيعات المنتجات"
        />
        
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.salesProfit)}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-orange-500"
          subtitle="من المبيعات والقائمة البيضاء"
        />
      </div>

      {/* Single Sessions Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="إيرادات الحصص المفردة"
          value={formatCurrency(stats.singleSessionRevenue)}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-cyan-500"
          subtitle={`${stats.singleSessionCount} حصة`}
        />
        
        <StatCard
          title="عدد الحصص المفردة"
          value={stats.singleSessionCount}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-teal-500"
          subtitle="للغير مشتركين"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المشتركين"
          value={stats.totalSubscribers}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-indigo-500"
          subtitle={`${stats.activeSubscribers} نشط`}
        />
        
        <StatCard
          title="المنتجات"
          value={stats.totalProducts}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-teal-500"
          subtitle={`${stats.lowStockProducts} مخزون منخفض`}
        />
        
        <StatCard
          title="مبيعات الفترة"
          value={stats.totalSales}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-pink-500"
          subtitle="عملية بيع"
        />
        
        <StatCard
          title="مشتركين منتهية صلاحيتهم"
          value={stats.expiringSubscribers}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-red-500"
          subtitle="قريباً"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-ar">
          <div className="card-header-ar">
            <h3 className="text-lg font-semibold text-gray-900 arabic-text flex items-center">
              <TrendingUp className="w-5 h-5 ml-2" />
              الأداء المالي
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إجمالي الإيرادات</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إيرادات الاشتراكات</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(stats.subscriptionRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إيرادات المبيعات</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(stats.salesRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إيرادات الحصص المفردة</span>
              <span className="font-semibold text-cyan-600">
                {formatCurrency(stats.singleSessionRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">صافي الربح</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(stats.salesProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">هامش الربح</span>
              <span className="font-semibold text-indigo-600">
                {stats.salesRevenue > 0 
                  ? `${((stats.salesProfit / stats.salesRevenue) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="card-ar">
          <div className="card-header-ar">
            <h3 className="text-lg font-semibold text-gray-900 arabic-text flex items-center">
              <BarChart3 className="w-5 h-5 ml-2" />
              حالة المشتركين
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">مشتركين نشطين</span>
              <span className="status-active">
                {stats.activeSubscribers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">اشتراكات منتهية الصلاحية قريباً</span>
              <span className="status-expiring">
                {stats.expiringSubscribers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">معدل التجديد</span>
              <span className="font-semibold text-indigo-600">
                {stats.totalSubscribers > 0 
                  ? `${((stats.activeSubscribers / stats.totalSubscribers) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-ar">
        <div className="card-header-ar">
          <h3 className="text-lg font-semibold text-gray-900 arabic-text">
            إجراءات سريعة
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/dashboard/subscribers')}
            className="btn-primary-ar arabic-text flex items-center justify-center"
          >
            <UserPlus className="w-5 h-5 ml-2" />
            إضافة مشترك جديد
          </button>
          <button 
            onClick={() => navigate('/dashboard/sales')}
            className="btn-secondary-ar arabic-text flex items-center justify-center"
          >
            <CreditCard className="w-5 h-5 ml-2" />
            إنشاء فاتورة مبيعات (Space)
          </button>
          <button 
            onClick={() => navigate('/dashboard/products')}
            className="btn-secondary-ar arabic-text flex items-center justify-center"
          >
            <Package className="w-5 h-5 ml-2" />
            إضافة منتج جديد
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;