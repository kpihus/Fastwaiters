/**
 * Created by Kristjan on 9.10.2014.
 */
//Ilitialize fastclick to get (guess what) faster click
window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);
$(function() {
    function showSpinner() {
        $('#ajaxload').show();
    }
    function hideSpinner() {
        $('#ajaxload').hide();
    }

    $(document).ajaxStart(showSpinner).ajaxStop(hideSpinner);
});




$(document).ready(function(){
    /*
     Global variables
     */
    var server;
    var clientcode;
    var main = $('.main');
    //var server = $('#server').val();
    //var clientcode = $('#clientcode').val();
    var numbtn = $('.numbtn');
    var goToLogout = 0;
    var refreshId = setInterval(function () {
        goToLogout=0;
    },5000);

    //Translations
    var g_messSent = "Teade on saadetud";
    var g_waiterComing = "Teenindaja saabub peatselt";
    var g_payCard='kaardimakse';
    var g_payCash='sularaha';




    /*
     Knockout vm
     */
    var data = {
        "locale_data": {
            "messages": {
                "": {"lang": "et"
                }
            }
        }
    };


        var i18n = new Jed(data);

    ko.bindingHandlers.translate = {
        init: function(element, valueAccessor) {
            element.dataset.initial = element.innerHTML;
        },
        update: function(element, valueAccessor) {
            var opts = ko.unwrap(valueAccessor());
            var message = element.dataset.initial;

            var result;
            if (typeof(opts) === 'string') {
                result = i18n.translate(message).fetch();
            }
            else if (typeof(opts) === 'object') {
                var plural = ko.unwrap(opts.plural);
                var count = ko.unwrap(opts.count);

                result = i18n.translate(message).ifPlural(count, plural).fetch(count);
            }

            element.innerHTML = result;
        }
    };


    ///

    var Router = function Router(currentPAge) {
        var self=this;
        this.Page = ko.observable(currentPAge);
        this.server = ko.observable();
        this.clientcode = ko.observable();
        this.sessid = ko.observable();
        this.companyLogo = ko.observable();
        this.message = ko.observableArray();

        this.savesettings = function () {
            localStorage.setItem('server',self.server());
            localStorage.setItem('client',self.clientcode());
            server = vm.router.server();
            clientcode = vm.router.clientcode();
        };


        this.GoToLogin = function () {
            this.Page('Login');
        };
        this.GoToTable = function(){
            this.Page('Tables');
        };
        this.GoToProducts = function(){
            this.Page('Products');
        }
    };

    var Auth =function Auth(){
        this.pincode= ko.observable()
    };

    var TableItem = function TableItem(data){
        this.id=ko.observable(data.id);
        this.name=ko.observable(data.name);
    };
    var LangItem = function LangItem(data){
        this.tag = ko.observable(data.tag);
        this.name = ko.observable(data.name);
    };

    var Tables = function Vm() {
        this.tableItems  = ko.observableArray([]);
        this.columnCount = ko.observable(4);

        this.columns = ko.computed(function() {
            var columns     = [],
                itemCount   = this.tableItems().length,
                begin       = 0;
            while (begin + 1 < itemCount) {
                columns.push( this.tableItems.slice(begin, begin + this.columnCount()) );
                begin += this.columnCount();
            }
            return columns;

        }, this);
    };

    var Langs = function Langs(){
        var self=this;
        this.langItems  = ko.observableArray([]);
        this.selLang = ko.observable();
        this.selLangTag = ko.observable();
        this.setLanguage = function(){
            vm.lang.selLang(this.name());
            vm.lang.selLangTag(this.tag());

            $.getJSON(server+'/menu/app/translations',{lang:this.tag()},function(data){
                i18n = new Jed(data);
                self.selLangTag(this.tag);
            }.bind(this));
        };
    };
    var ProdRow = function ProdRow(data) {
        this.id = ko.observable(data.id);
        this.name = ko.observable(data.name);
        this.price = ko.observable(data.price);
    };
    var Product = function Product(){
        this.catList = ko.observableArray([]);
        this.prodList = ko.observableArray([]);
        this.orderList = ko.observableArray([]);
        this.pendingOrder = ko.observableArray([]);
        this.waiter = ko.observable();
        this.waiterid=ko.observable();
        this.currency=ko.observable();

        this.selectedCategory = ko.observable();
        this.selectedCatname = ko.observable();

        this.orderNotes = ko.observable();
        this.bigSrc = ko.observable();

        this.selectCategory= function(category){
            var catpage =$('.catpage');
            $(catpage).hide(500);
            $('#sidemenu').hide(500);
            vm.prod.selectedCategory(category.catid);
            vm.prod.selectedCatname(category.catname);
            $(catpage).show(500);
        };
        this.addPendingOrder = function(product){

            var item = new ProdRow({
                id: product.id,
                name: product.name,
                price: product.price
            });
            vm.prod.pendingOrder.push(item);

        };
        this.removeItem = function () {
            vm.prod.pendingOrder.remove(this);
        };
        this.orderPrice = ko.computed(function(){
            var grandtotal = 0;
            ko.utils.arrayForEach(this.pendingOrder(), function (item) {
                grandtotal=grandtotal+parseFloat(item.price());
            });
            return grandtotal.toFixed(2);
        },this)
        this.bigImage = function () {
            vm.prod.bigSrc(this.picurl);
            $('#bigimage').modal('show');
        }

    };

    vm = {
        router: new Router(),
        login: new Auth(),
        tables: new Tables(),
        lang: new Langs(),
        prod: new Product()
    };

    ko.applyBindings(vm);
    vm.login.pincode('');
    vm.router.server(localStorage.getItem('server'));
    vm.router.clientcode(localStorage.getItem('client'));

    server = vm.router.server();
    clientcode = vm.router.clientcode();


    /*
    Get Translations
     */


    /*
     Preflight check
     */
    $.getJSON(server+'/menu/app/status',{sessid: localStorage.getItem('sessid'),company:clientcode})
        .success(function (data) {
            console.log(data);
            if(data.state != 'OK'){
                vm.router.message.push('Vabandust');
                vm.router.message.push('Serveriga ei ole võimalik suhelda');
                vm.router.message.push('Palun kontrolli internetiühendust');
                $('#message').modal('show');
            }else{
                vm.router.sessid(data.sessid);
                vm.lang.selLangTag(data.lang);
                vm.router.companyLogo(data.logo);
                //getTranslations();
                if(data.menuauth){
                    if(data.sessid >0){
                        getOpenOrders();
                    }
                    if(data.tbl>0){
                        getProducts();
                    }else{
                        getTables();
                    }
                }else{
                    vm.router.GoToLogin();
                }
            }
        }).fail(function(){
            vm.router.message.push('Viga!');
            vm.router.message.push('Ühendus serveriga ebaõnnestus');
            vm.router.message.push('Palun kontrolli seadistusi');
            $('#message').modal('show');
            vm.router.GoToLogin();
        });

    function getTranslations(){
        $.getJSON(server+'/menu/app/translations',{lang:vm.lang.selLangTag},function(data){
            i18n = new Jed(data);
            ko.applyBindings(vm);
        })
    }
    //Empty messages array on modal close
    $('#message').on('hidden.bs.modal', function () {
        vm.router.message.removeAll();
    });

    /*
     Login section
     */
    //nupp = document.getElementsByClassName("numbtn");
    var pinfield = $(main).find('.pinfiled');
    var flag = false;
    //Add pin code
    //$(main).on('click','.numbtn',function(){
    $('.numbtn').bind('touchstart click',function(){
        //$(numbtn).bind('touchstart',function () {
        var pinfield = $(main).find('.pinform').find('.pinfiled');
        if (!flag) {
            $('.pinalert').slideUp(200);
            flag = true;
            setTimeout(function(){ flag = false; }, 100);
            $(this).effect('highlight');
            var nr=String($(this).data('nr'));
            var old=String(vm.login.pincode());
            vm.login.pincode(old+nr);
        }
        return false
    });


    //Clear button
    $('.clrbtn').bind('touchstart click', function (){
        $(this).effect('highlight');
        var nr=vm.login.pincode();
        pinval = nr.substr(0,nr.length-1);
        vm.login.pincode(pinval);
    });


    //Submit pin code
    //$(main).bind('click','.entbtn',function(){
    $('.entbtn').bind('touchstart click',function(){
        $(this).effect('highlight');
        var pin = $('#pinfield').val();
        $.ajax({
            url: server+"/menu/app/auth",
            type: "POST",
            data: {
                pincode: pin,
                client: clientcode,
                action: 'auth'
            },
            success: function(data){
                if(data=="fail"){
                    $('.pinalert').slideDown(200);
                    vm.login.pincode('');
                }else{
                    vm.login.pincode('');
                    vm.router.sessid(data.sessid);
                    localStorage.setItem('sessid',data.sessid);
                    renderTables(data.tables);
                    renderLanguages(data);
                }
            },
            error: function(data){
                vm.router.message.push('Viga!');
                vm.router.message.push('Ühendus serveriga ebaõnnestus');
                vm.router.message.push('Palun kontrolli seadistusi');
                $('#message').modal('show');
                vm.router.GoToLogin();
            }
        })

    });

    /*
     END Login section
     */

    /*
     Tables section
     */
    function getTables(){
        $.ajax({
            url: server+'/menu/app/tables',
            type: 'POST',
            data: {
                sessid: vm.router.sessid()
            },
            success: function(data){
                renderTables(data.tables);
                renderLanguages(data);
            }
        })
    }
    function renderTables(data){
        vm.tables.tableItems.removeAll();
        $.each(data, function (index, value) {
            vm.tables.tableItems.push(new TableItem({
                id:value.id,
                name: value.name
            }))
        });
        //$('#tableList').text(ko.mapping.toJS(vm.tableList()));
        //$(main).html($('#tablesTmpl').html());
        vm.router.GoToTable();
    }
    function renderLanguages(data){
        vm.lang.selLang(data.deflang);
        vm.lang.selLangTag(data.deflangtag);
        $.each(data.langs, function (index, value) {
            vm.lang.langItems.push(new LangItem({
                tag: value.tag,
                name: value.name
            }))
        })
    }

    //Post table/lang info to server and get menu
    $(main).on('click','.chstable', function () {
        $(this).effect('highlight');
        var langtag = vm.lang.selLangTag();
        var tableid = $(this).data('id');

        $.ajax({
            url: server+'/menu/app/products',
            type: "POST",
            data:{
                sessid: vm.router.sessid(),
                lang: langtag,
                table: tableid
            },
            success: function(data){
                if (data != '500') {
                    vm.prod.catList(data.catlist);
                    vm.prod.prodList(data.prodlist);
                    vm.prod.waiter(data.waiter);
                    vm.prod.waiterid(data.waiterid);
                    vm.prod.currency(data.currency);
                    vm.router.GoToProducts();
                }
            }
        })
    });


    /*
     END Tables section
     */

    /*
     Prodpage section
     */
    function getProducts(){
        $.ajax({
            url: server+'/menu/app/products',
            type: "POST",
            data:{
                sessid:vm.router.sessid()
            },
            success: function(data){
                if (data != '500') {
                    vm.prod.catList(data.catlist);
                    vm.prod.prodList(data.prodlist);
                    vm.prod.waiter(data.waiter);
                    vm.prod.waiterid(data.waiterid);
                    vm.prod.currency(data.currency);
                    vm.router.GoToProducts();
                }
            }
        })
    }
    $('.waitername').bind('touchstart click',function () {
        $(this).effect('highlight');
        goToLogout++;
        if(goToLogout>=2){
            $.getJSON(server+'/menu/app/logout',{sessid: vm.router.sessid()},function(data){
                if(data=="done"){
                    goToLogout=0;
                    $('#invoice').hide('blind');
                    $('.catpage').hide(500);
                    $('#payresult').hide(500);
                    vm.prod.orderList.removeAll();
                    vm.lang.langItems.removeAll();
                    vm.router.sessid(null);
                    vm.tables.tableItems.removeAll();
                    localStorage.removeItem('sessid');
                    vm.router.GoToLogin();
                }
            })
        }
    });
    //Close categories menu
    $('#closemenu').bind('touchstart click', function () {
        $('#sidemenu').hide(100);
    });
    //Open categories menubar
    $('#startmenu').bind('click', function () {
        $('#sidemenu').show(100);
    });
    //Open pending order view
    $(main).on('click','#orderopen', function () {
        $('#ordermenu').show(100);
    });
    //Close pending order view
    $(main).on('click','#closeorder', function () {
        $('#ordermenu').hide(100);
    });
    //Make a fly effect for product + button
    $(main).on('click','.orderbox', function () {
        $(this).closest('tr').effect("transfer",{ to: $("#prodcount") }, 500);
        $('#orderopen').effect('highlight');
    });
    //To confirm order
    $(main).on('click','#conforder', function () {
        if (vm.prod.pendingOrder().length>0) {
            $(this).effect('highlight');
            makeOrder();
        } else {
            $('#totalsum').effect('highlight',500);
        }
    });
    //Call waitress
    $(main).on('click','#callservice', function () {
        $('#callservice').css('color','#f4ff77');
        $(this).effect('highlight');
        send_message(1);
    });
    //Open invoice view
    $(main).on('click','#invopen', function () {
        getOpenOrders();
        $(this).effect('highlight');
        $('#sidemenu').hide(300);
        $('#ordermenu').hide(300);
        $('#invoice').show('blind');
    });
    //Close invoice view
    $(main).on('click','#closeinv', function () {
        $('#invoice').hide('blind');

    });

    function makeOrder(){
        var items = ko.mapping.toJS(vm.prod.pendingOrder());
        var list = [];
        var orderlist = [];
        //Extract product id's (thats all what we need)
        ko.utils.arrayForEach(vm.prod.pendingOrder(), function (item) {
            list.push(item.id);
        });

        //Make list unique (remove dublicate items
        var uniqlist = list.unique();

        //Loop over list with all id's and count them
        $.each(uniqlist,function(key,value){
            var pqty=countItems(list,value);
            orderlist.push({'id':value, 'qty':pqty});
        });
        var data={
            products: orderlist,
            notes: vm.prod.orderNotes(),
            sessid: vm.router.sessid()
        };
        $.ajax({
            url: server+'/menu/app/saveorder',
            type: 'POST',
            data: data,
            success: function(data){
                if(data=='200'){
                    $('#ordermenu').hide(300);
                    vm.prod.orderNotes(null);
                    vm.prod.pendingOrder.removeAll();
                    vm.router.message.push('Täname');
                    vm.router.message.push('Teie tellimus on teenindajale edastatud.');
                    vm.router.message.push('Kui soovite tellida juurde siis valige toode ning kinnitage tellimus.');
                    $('#message').modal('show');
                    getOpenOrders();
                }
            }
        })
    }

    Array.prototype.unique = function() {
        var arr = [];
        for(var i = 0; i < this.length; i++) {
            if(!arr.contains(this[i])) {
                arr.push(this[i]);
            }
        }
        return arr;
    };
    Array.prototype.contains = function(v) {
        for(var i = 0; i < this.length; i++) {
            if(this[i] === v) return true;
        }
        return false;
    };
    function countItems(arr,item){
        var count=0;
        $.each(arr,function(key,value){
            if(value==item){count++}
        });
        return count;
    }

    function send_message(type, order) {
        $.ajax({
            url: server+'/menu/app/message',
            type: "POST",
            cache: false,
            data: {
                sessid: vm.router.sessid(),
                MessageType: type,
                Order: order,
                waiter: vm.prod.waiterid()
            },  // type hardcoded, replace with variable for multiple options
            success: function(){
                if(type==1){
                    vm.router.message.push(g_messSent);
                    vm.router.message.push(g_waiterComing);
                    $('#message').modal('show');
                }
                $('#callservice').css('color','#fff');
            }
        });
    }
    function getOpenOrders(){
        $.ajax({
            url: server+'/menu/app/orders',
            type: "POST",
            data:{
                sessid: vm.router.sessid()
            },
            success: function (data) {
                console.log(data);
                vm.prod.orderList(data);
            }
        })
    }

    $('#paycard').click(function(){
        $(this).effect('highlight');
        send_message(3);
        $('#paytype').text(g_payCard);
        $('#invoice').hide();
        $('#payresult').show();
    });
    $('#paycash').click(function(){
        $(this).effect('highlight');
        send_message(2);
        $('#paytype').text(g_payCash);
        $('#invoice').hide();
        $('#payresult').show();
    });
//partial payment

    $('.invoice').on('click','.sPay',function(){
        var orderid = $(this).data('id');
        var method = $(this).data('method');
        if(method=="card"){
            var type=3;
        }else if(method=="cash"){
            var type=2;
        }else{
            return null;
        }
        send_message(type,orderid);
        $.gritter.add({
            title: g_messSent,
            text: g_waiterComing
        });
        var cell = $(this).closest('td');
        cell.find('button').removeClass('redbtn');
        cell.find('button').addClass('grnbtn');

    });

    //$(main).on('click','.prodimg', function () {
    //    console.log('Go big');
    //    $('#bigimage').modal('show');
    //});

    /*
     END Prodpage section
     */


});