package main

import (
	"context"
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/bsure-analytics/bsure-chatbot-grafana-panel/pkg/plugin"
)

func main() {
	// Create a single instance of our plugin
	ds, err := plugin.NewDatasource(context.Background(), backend.DataSourceInstanceSettings{})
	if err != nil {
		log.DefaultLogger.Error("Failed to create plugin instance", "error", err)
		os.Exit(1)
	}

	// Create backend opts with just the CallResourceHandler
	opts := backend.ServeOpts{
		CallResourceHandler: ds.(*plugin.Datasource),
	}

	if err := backend.Serve(opts); err != nil {
		log.DefaultLogger.Error(err.Error())
		os.Exit(1)
	}
}